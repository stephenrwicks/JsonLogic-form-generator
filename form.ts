
type Field = Textbox | Checkbox;

type FieldBase = {
    type: 'textbox' | 'checkbox';
    name: string; // Object property name
    label: string;
    //sortOrder?: number;
    // tooltip?: string | string[];
    visible?: Rule[] | boolean;
    required?: Rule[] | boolean;
    disabled?: Rule[] | boolean;
    readonly?: Rule[] | boolean;
};

type Textbox = FieldBase & {
    type: 'textbox';
    value?: string;
    placeholder?: string;
    minLength?: number;
    maxLength?: number;
};

type Checkbox = FieldBase & {
    type: 'checkbox';
    value?: boolean;
}

// JSONLogic
// Possibly add error strings for each
type VarRef = { var: string }; // e.g. { "var": "fieldName" }
type EqualsRule = { '==': [VarRef, unknown] };
type NotEqualsRule = { '!=': [VarRef, unknown] };
type LessThanRule = { '<': [VarRef, unknown] };
type LessThanOrEqualToRule = { '<=': [VarRef, unknown] };
type GreaterThanRule = { '>': [VarRef, unknown] };
type GreaterThanOrEqualToRule = { '>=': [VarRef, unknown] };
type AndRule = { and: Rule[] };
type OrRule = { or: Rule[] };
type Rule = EqualsRule | NotEqualsRule | LessThanRule | LessThanOrEqualToRule | GreaterThanRule | GreaterThanOrEqualToRule | AndRule | OrRule;


type Config = {
    name: string;
    fields: Field[];
}

const Form = (config: Config) => {

    //type FieldInternal = TextboxInternal | CheckboxInternal;
    type FieldInternal = Readonly<{
        el: HTMLDivElement;
        id: string;
        name: string;
        visible: boolean;
        required: boolean;
        disabled: boolean;
        readonly: boolean;
        updateState(formValues: Record<string, unknown>): void;
    }>;


    type TextboxInternal = FieldInternal & {
        readonly value: string;
    };
    type CheckboxInternal = FieldInternal & {
        readonly value: boolean;
    };

    const getId = () => `_${crypto.randomUUID()}`;

    const checkbox = (f: Checkbox) => {
        const id = getId();
        const label = document.createElement('label');
        const input = document.createElement('input');
        label.htmlFor = id;
        input.id = id;
        input.name = f.name;
        input.type = 'checkbox';
        input.checked = !!f.value;
        label.replaceChildren(input, f.label);
        const div = document.createElement('div');
        div.replaceChildren(label);

        let _visible = true;
        let _disabled = false;
        let _required = false;
        let _readonly = false;

        const internals: CheckboxInternal = {
            get id() {
                return id;
            },
            get name() {
                return f.name;
            },
            get value() {
                return input.checked;
            },
            get visible() {
                return _visible;
            },
            get disabled() {
                return _disabled;
            },
            get required() {
                return _required;
            },
            get readonly() {
                return _readonly;
            },
            get el() {
                return div;
            },
            updateState(formValues) {
                div.style.display = resolveRuleSet(f.visible, formValues, true) ? '' : 'none';
                input.required = resolveRuleSet(f.required, formValues, false);
                input.disabled = resolveRuleSet(f.disabled, formValues, false);
                input.readOnly = resolveRuleSet(f.readonly, formValues, false);
            }
        }

        return internals;
    };

    const textbox = (f: Textbox) => {
        const id = getId();
        const div = document.createElement('div');
        const label = document.createElement('label');
        const input = document.createElement('input');
        label.textContent = f.label;
        label.htmlFor = id;
        input.id = id;
        input.name = f.name;
        input.type = 'text';
        input.value = f.value ?? '';
        input.placeholder = f.placeholder ?? '';
        if (input.minLength && typeof f.minLength === 'number') input.minLength = f.minLength;
        if (input.maxLength && typeof f.maxLength === 'number') input.maxLength = f.maxLength;
        div.replaceChildren(label, input);

        let _visible = true;
        let _disabled = false;
        let _required = false;
        let _readonly = false;

        const internals: TextboxInternal = {
            get id() {
                return id;
            },
            get name() {
                return f.name;
            },
            get value() {
                return input.value.trim();
            },
            get visible() {
                return _visible;
            },
            get disabled() {
                return _disabled;
            },
            get required() {
                return _required;
            },
            get readonly() {
                return _readonly;
            },
            get el() {
                return div;
            },
            updateState(formValues) {
                div.style.display = resolveRuleSet(f.visible, formValues, true) ? '' : 'none';
                input.required = resolveRuleSet(f.required, formValues, false);
                input.disabled = resolveRuleSet(f.disabled, formValues, false);
                input.readOnly = resolveRuleSet(f.readonly, formValues, false);
            }
        }

        return internals;
    };


    const evaluateRule = (rule: Rule, formValues: Record<string, unknown>): boolean => {
        const getRulePartValue = (operand: any) => !!operand && typeof operand === 'object' && 'var' in operand ? formValues[operand.var] : operand;

        if ('==' in rule) {
            const [left, right] = rule['=='];
            return getRulePartValue(left) === getRulePartValue(right);
        }

        if ('!=' in rule) {
            const [left, right] = rule['!='];
            return getRulePartValue(left) !== getRulePartValue(right);
        }

        if ('>' in rule) {
            const [left, right] = rule['>'];
            return getRulePartValue(left) > getRulePartValue(right);
        }

        if ('<' in rule) {
            const [left, right] = rule['<'];
            return getRulePartValue(left) < getRulePartValue(right);
        }

        if ('>=' in rule) {
            const [left, right] = rule['>='];
            return getRulePartValue(left) >= getRulePartValue(right);
        }

        if ('<=' in rule) {
            const [left, right] = rule['<='];
            return getRulePartValue(left) <= getRulePartValue(right);
        }

        if ('and' in rule) {
            return rule.and.every((r) => evaluateRule(r, formValues));
        }

        if ('or' in rule) {
            return rule.or.some((r) => evaluateRule(r, formValues));
        }

        return true;
    };

    const createField = (field: Field): FieldInternal => {
        let fieldInternal;

        if (field.type === 'checkbox') fieldInternal = checkbox(field);
        else if (field.type === 'textbox') fieldInternal = textbox(field);
        if (!fieldInternal) throw new Error('No type found');
        nameToIdMap.set(field.name, fieldInternal.id);
        idToFieldMap.set(fieldInternal.id, fieldInternal);

        return fieldInternal;
    };

    const deleteField = (id: string) => {
        const fieldInternal = getFieldInternalById(id);
        if (!fieldInternal) return;
        idToFieldMap.delete(fieldInternal.id);
        //nameToIdMap.delete(fieldInternal.name);
    };

    const idToFieldMap: Map<string, (TextboxInternal | CheckboxInternal)> = new Map();
    const nameToIdMap: Map<string, string> = new Map();

    const getFieldInternalById = (id: string) => {
        return idToFieldMap.get(id);
    };

    const getFormValues = () => {
        // // Get this on every change => evaluate rules for every input by cycling through map => use internal setters to change status => update dom
        const values: Record<string, unknown> = {};
        for (const fieldInternal of idToFieldMap.values()) {
            if (fieldInternal.disabled) continue;
            if (!fieldInternal.visible) continue;
            values[fieldInternal.name] = fieldInternal.value ?? '';
        }

        return values;
    };

    const updateFormStateForAllFields = () => {
        const formValues = getFormValues();
        for (const fieldInternal of idToFieldMap.values()) {
            // Somewhere the form state has to be passed into the updater, whether it's all the values, or the dependencies, etc
            fieldInternal.updateState(formValues);
        }
    };

    const resolveRuleSet = (
        rules: Rule[] | boolean | undefined,
        formValues: Record<string, unknown>,
        fallback: boolean
    ): boolean => {
        if (typeof rules === 'boolean') return rules;
        if (Array.isArray(rules)) return rules.every(rule => evaluateRule(rule, formValues));
        return fallback;
    };


    const form = document.createElement('form');

    const submitButton = document.createElement('button');
    submitButton.type = 'submit';
    submitButton.textContent = 'Submit';

    const buttonRow = document.createElement('div');
    buttonRow.replaceChildren(submitButton);





    for (const f of config.fields) {
        const fieldInternal = createField(f);
        form.append(fieldInternal.el);
    }

    form.append(buttonRow);
    form.addEventListener('change', () => {
        updateFormStateForAllFields();
        console.log(getFormValues());
    });
    updateFormStateForAllFields();


    return form;
};

const fields: Field[] = [
    {
        type: 'textbox',
        name: 'fullName',
        label: 'Full Name',
        value: '',
        placeholder: 'Enter your full name',
        minLength: 2,
        maxLength: 80,
    },
    {
        type: 'checkbox',
        name: 'hasLibraryCard',
        label: 'I already have a library card',
        value: false,
    },
    {
        type: 'textbox',
        name: 'libraryCardNumber',
        label: 'Library Card Number',
        value: '',
        placeholder: 'Enter card number',
        maxLength: 20,
        visible: [
            {
                '==': [{ var: 'hasLibraryCard' }, true],
            },
        ],
        required: [
            {
                '==': [{ var: 'hasLibraryCard' }, true],
            },
        ],
    },
    {
        type: 'checkbox',
        name: 'requestDigitalAccess',
        label: 'Request digital access (ebooks, audiobooks)',
        value: true,
    },
    {
        type: 'textbox',
        name: 'email',
        label: 'Email Address',
        value: '',
        placeholder: 'Enter email address',
        maxLength: 100,
        required: [
            {
                '==': [{ var: 'requestDigitalAccess' }, true],
            },
        ],
    },
    {
        type: 'checkbox',
        name: 'isMinor',
        label: 'Applicant is under 18',
        value: false,
    },
    {
        type: 'textbox',
        name: 'guardianName',
        label: 'Guardian Name',
        value: '',
        placeholder: 'Enter parent or guardian name',
        visible: [
            {
                '==': [{ var: 'isMinor' }, true],
            },
        ],
        required: [
            {
                and: [
                    { '==': [{ var: 'isMinor' }, true] },
                    { '!=': [{ var: 'fullName' }, ''] },
                ],
            },
        ],
    },
    {
        type: 'checkbox',
        name: 'agreePolicies',
        label: 'I agree to borrowing policies',
        value: false,
    },
    {
        type: 'textbox',
        name: 'pickupLocation',
        label: 'Preferred Pickup Location',
        value: '',
        placeholder: 'Enter branch name',
        disabled: [
            {
                or: [
                    { '==': [{ var: 'agreePolicies' }, false] },
                    { '==': [{ var: 'hasLibraryCard' }, false] },
                ],
            },
        ],
    },
];

const formEl = Form({ fields, name: 'test' });
document.body.replaceChildren(formEl);