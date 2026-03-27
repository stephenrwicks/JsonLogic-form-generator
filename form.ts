
type Field = Textbox | Checkbox | Select | Integer;

type FieldBase = {
    type: 'textbox' | 'checkbox' | 'select' | 'integer';
    name: string; // Object property name
    label: string;
    //sortOrder?: number;
    // tooltip?: string | string[];
    visible?: Rule[] | boolean;
    required?: Rule[] | boolean;
    disabled?: Rule[] | boolean;
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

type Integer = FieldBase & {
    type: 'integer';
    value?: number;
    placeholder?: string;
    min?: number;
    max?: number;
};

type Select = FieldBase & {
    type: 'select';
    options: {
        text: string;
        value: string;
    }[];
    value?: string;
    placeholder?: string;

};

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

    type FieldInternal = Readonly<{
        type: FieldBase['type'];
        el: HTMLDivElement;
        name: string;
        visible: boolean;
        required: boolean;
        disabled: boolean;
        value: unknown;
        updateState(formValues: Record<string, unknown>): void;
    }>;

    const FIELDS: Record<string, FieldInternal> = {};

    const buildField = (f: Field) => {
        const id = `_${crypto.randomUUID()}`;
        const div = document.createElement('div');
        const label = document.createElement('label');
        // const labelSpan = document.createElement('span');
        // const requiredSpan = document.createElement('span');
        label.htmlFor = id;
        // labelSpan.textContent = f.label;
        // requiredSpan.textContent = ' *';
        // requiredSpan.ariaHidden = 'true';
        //label.replaceChildren(labelSpan, requiredSpan);
        let input: HTMLInputElement | HTMLSelectElement;
        let getValue: () => unknown;

        if (f.type === 'checkbox') {
            input = document.createElement('input');
            input.id = id;
            input.name = f.name;
            input.type = 'checkbox';
            input.checked = !!f.value;
            label.replaceChildren(input, f.label);
            div.replaceChildren(label);
            div.style.alignContent = 'end';
            getValue = () => !!(input as HTMLInputElement).checked;
        }
        else if (f.type === 'textbox') {
            input = document.createElement('input');
            input.id = id;
            input.name = f.name;
            input.type = 'text';
            input.value = f.value ?? '';
            input.placeholder = f.placeholder ?? '';
            if (typeof f.maxLength === 'number') input.maxLength = f.maxLength;
            if (typeof f.minLength === 'number') input.minLength = f.minLength;
            label.textContent = f.label;
            div.replaceChildren(label, input);
            getValue = () => input.value.trim();
        }
        else if (f.type === 'select') {
            input = document.createElement('select');
            input.id = id;
            input.name = f.name;
            label.textContent = f.label;
            input.add(new Option(f.placeholder || '-', '', false));
            for (const option of f.options) {
                input.add(new Option(option.text, option.value, option.value === f.value));
            }
            div.replaceChildren(label, input);
            getValue = () => input.value;
        }
        else {
            throw new Error(`field ${(f as Field).name} type invalid`);
        }

        let _visible = true;
        let _disabled = false;
        let _required = false;

        // Stretch across entire grid if it's conditionally displayed. Otherwise, you get fields moving around left/right
        if (typeof f.visible === 'boolean' || Array.isArray(f.visible)) {
            div.style.gridColumn = '1/-1';
        }

        const internals: FieldInternal = {
            get type() {
                return f.type;
            },
            get name() {
                return f.name;
            },
            get value() {
                return getValue();
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
            get el() {
                return div;
            },
            updateState(formValues) {
                _visible = evaluateProperty(f.visible, formValues, true);
                _disabled = evaluateProperty(f.disabled, formValues, false);
                _required = evaluateProperty(f.required, formValues, false);
                if (_visible) {
                    div.style.display = '';
                    input.disabled = false;
                }
                else {
                    div.style.display = 'none';
                }

                input.required = _required;
                input.disabled = _disabled || !_visible;
            }
        }

        FIELDS[f.name] = internals;

        return internals;
    };

    /** 
     * Figures out what a property should be based on form values.
     * Returns default if not defined
     */
    const evaluateProperty = (propertyVal: Rule[] | boolean | undefined, formValues: Record<string, unknown>, defaultValue: boolean): boolean => {
        if (typeof propertyVal === 'boolean') return propertyVal;
        if (Array.isArray(propertyVal)) return propertyVal.every(rule => evaluateRule(rule, formValues));
        return defaultValue;
    };

    /** Makes a rule comparison against another field using operand. 
     * A little repetitive, but it's easier to understand doing the operations one-by-one 
     * Also needs some type checking, maybe, or else you can do weird things like 'a' < 'aa' etc*/
    const evaluateRule = (rule: Rule, formValues: Record<string, unknown>): boolean => {
        const evaluateSide = (operand: any) => !!operand && typeof operand === 'object' && 'var' in operand ? formValues[operand.var] : operand;
        console.log('Evaluated a rule');
        if ('==' in rule) {
            const [left, right] = rule['=='];
            return evaluateSide(left) === evaluateSide(right);
        }
        else if ('!=' in rule) {
            const [left, right] = rule['!='];
            return evaluateSide(left) !== evaluateSide(right);
        }
        else if ('>' in rule) {
            const [left, right] = rule['>'];
            return evaluateSide(left) > evaluateSide(right);
        }
        else if ('<' in rule) {
            const [left, right] = rule['<'];
            return evaluateSide(left) < evaluateSide(right);
        }
        else if ('>=' in rule) {
            const [left, right] = rule['>='];
            return evaluateSide(left) >= evaluateSide(right);
        }
        else if ('<=' in rule) {
            const [left, right] = rule['<='];
            return evaluateSide(left) <= evaluateSide(right);
        }
        // These are collections of other rules, so we use recursion here
        else if ('and' in rule) {
            return rule.and.every((r) => evaluateRule(r, formValues));
        }
        else if ('or' in rule) {
            return rule.or.some((r) => evaluateRule(r, formValues));
        }
        return true;
    };

    const getEmptyValue = ({ type }: FieldInternal) => {
        if (type === 'checkbox') return false;
        if (type === 'textbox' || type === 'select') return '';
        if (type === 'integer') return 0;
    };

    const getFormValues = () => {
        // // Get this on every change => evaluate rules for every input by cycling through map => use internal setters to change status => update dom
        const values: Record<string, unknown> = {};
        for (const fieldInternal of Object.values(FIELDS)) {
            if (fieldInternal.disabled || !fieldInternal.visible) {
                values[fieldInternal.name] = getEmptyValue(fieldInternal);
                continue;
            }
            values[fieldInternal.name] = fieldInternal.value ?? getEmptyValue(fieldInternal);
        }

        return values;
    };

    const updateFormStateForAllFields = () => {
        const formValues = getFormValues();
        for (const fieldInternal of Object.values(FIELDS)) {
            // Somewhere the form state has to be passed into the updater, whether it's all the values, or the dependencies, etc
            fieldInternal.updateState(formValues);
        }
    };

    const form = document.createElement('form');

    const submitButton = document.createElement('button');
    submitButton.type = 'submit';
    submitButton.textContent = 'Submit';

    const buttonRow = document.createElement('div');
    buttonRow.replaceChildren(submitButton);


    for (const f of config.fields) {
        const fieldInternal = buildField(f);
        form.append(fieldInternal.el);
    }

    form.append(buttonRow);
    form.addEventListener('change', () => {
        updateFormStateForAllFields();
    });
    form.addEventListener('input', () => {
        updateFormStateForAllFields();
    });
    updateFormStateForAllFields();

    return {
        el: form,
        get value() {
            return getFormValues();
        },
        set value(value: Record<string, unknown>) {

        },
        get formData() {
            return new FormData(form);
        },
    };
};

// const fields: Field[] = [
//     {
//         type: 'textbox',
//         name: 'username',
//         label: 'Username',
//         value: '',
//         placeholder: 'Choose a username',
//         minLength: 3,
//         maxLength: 30,
//         required: true,

//     },
//     {
//         type: 'checkbox',
//         name: 'subscribeNewsletter',
//         label: 'Subscribe to newsletter',
//         value: false,
//         visible: [
//             {
//                 '!=': [{ var: 'username' }, "stephen"],
//             },
//         ],
//     },
//     {
//         type: 'textbox',
//         name: 'email',
//         label: 'Email Address',
//         value: '',
//         placeholder: 'Enter your email',
//         maxLength: 100,
//         visible: [
//             {
//                 '==': [{ var: 'subscribeNewsletter' }, true],
//             },
//         ],
//         required: [
//             {
//                 '==': [{ var: 'subscribeNewsletter' }, true],
//             },
//         ],
//     },
// ];

const fields: Field[] = [
    {
        type: 'textbox',
        name: 'programName',
        label: 'Program Name',
        value: '',
        placeholder: 'Enter program name (Children, Teen, Adult, Tech Help)',
        maxLength: 50,
    },
    {
        type: 'checkbox',
        name: 'isYouthProgram',
        label: 'This registration is for a youth program',
        value: false,
    },
    {
        type: 'textbox',
        name: 'participantAge',
        label: 'Participant Age',
        value: '',
        placeholder: 'Enter age',
        maxLength: 3,
        visible: [
            {
                '==': [{ var: 'isYouthProgram' }, true],
            },
        ],
        required: [
            {
                '==': [{ var: 'isYouthProgram' }, true],
            },
        ],
    },
    {
        type: 'textbox',
        name: 'guardianName',
        label: 'Guardian Name',
        value: '',
        placeholder: 'Enter parent or guardian name',
        visible: [
            {
                and: [
                    { '==': [{ var: 'isYouthProgram' }, true] },
                    { '<': [{ var: 'participantAge' }, 13] },
                ],
            },
        ],
        required: [
            {
                and: [
                    { '==': [{ var: 'isYouthProgram' }, true] },
                    { '<': [{ var: 'participantAge' }, 13] },
                ],
            },
        ],
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
        name: 'needsAccommodation',
        label: 'Request accessibility accommodations',
        value: false,
    },
    {
        type: 'textbox',
        name: 'accommodationDetails',
        label: 'Accommodation Details',
        value: '',
        placeholder: 'Describe requested accommodations',
        maxLength: 200,
        visible: [
            {
                '==': [{ var: 'needsAccommodation' }, true],
            },
        ],
        required: [
            {
                '==': [{ var: 'needsAccommodation' }, true],
            },
        ],
    },
    {
        type: 'checkbox',
        name: 'requestReminder',
        label: 'Send me a reminder before the program',
        value: false,
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
                or: [
                    { '==': [{ var: 'requestReminder' }, true] },
                    { '==': [{ var: 'needsAccommodation' }, true] },
                ],
            },
        ],
    },
    {
        type: 'textbox',
        name: 'pickupBranch',
        label: 'Preferred Branch for Materials Pickup',
        value: '',
        placeholder: 'Enter branch name',
        disabled: [
            {
                or: [
                    { '==': [{ var: 'hasLibraryCard' }, false] },
                    { '==': [{ var: 'requestReminder' }, false] },
                ],
            },
        ],
    },
    {
        type: 'select',
        name: 'favoriteGenre',
        label: 'Favorite Book Genre',
        value: '',
        options: [
            { text: 'Fiction', value: 'fiction' },
            { text: 'Non-Fiction', value: 'nonfiction' },
            { text: 'Mystery', value: 'mystery' },
            { text: 'Science Fiction', value: 'scifi' },
            { text: 'Biography', value: 'biography' },
        ],
        placeholder: 'Select a genre',
        required: true,
        visible: true
    },
];
const form = Form({ fields, name: 'test' });
document.body.replaceChildren(form.el);