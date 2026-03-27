"use strict";
const Form = (config) => {
    const FIELDS = {};
    const buildField = (f) => {
        const id = `_${crypto.randomUUID()}`;
        const div = document.createElement('div');
        const label = document.createElement('label');
        label.htmlFor = id;
        let input;
        let getValue;
        if (f.type === 'checkbox') {
            input = document.createElement('input');
            input.id = id;
            input.name = f.name;
            input.type = 'checkbox';
            input.checked = !!f.value;
            label.replaceChildren(input, f.label);
            div.replaceChildren(label);
            div.style.alignContent = 'end';
            getValue = () => !!input.checked;
        }
        else if (f.type === 'textbox') {
            input = document.createElement('input');
            input.id = id;
            input.name = f.name;
            input.type = 'text';
            input.value = f.value ?? '';
            input.placeholder = f.placeholder ?? '';
            if (typeof f.maxLength === 'number')
                input.maxLength = f.maxLength;
            if (typeof f.minLength === 'number')
                input.minLength = f.minLength;
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
            throw new Error(`field ${f.name} type invalid`);
        }
        let _visible = true;
        let _disabled = false;
        let _required = false;
        if (typeof f.visible === 'boolean' || Array.isArray(f.visible)) {
            div.style.gridColumn = '1/-1';
        }
        const internals = {
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
        };
        FIELDS[f.name] = internals;
        return internals;
    };
    const evaluateProperty = (propertyVal, formValues, defaultValue) => {
        if (typeof propertyVal === 'boolean')
            return propertyVal;
        if (Array.isArray(propertyVal))
            return propertyVal.every(rule => evaluateRule(rule, formValues));
        return defaultValue;
    };
    const evaluateRule = (rule, formValues) => {
        const evaluateSide = (operand) => !!operand && typeof operand === 'object' && 'var' in operand ? formValues[operand.var] : operand;
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
        else if ('and' in rule) {
            return rule.and.every((r) => evaluateRule(r, formValues));
        }
        else if ('or' in rule) {
            return rule.or.some((r) => evaluateRule(r, formValues));
        }
        return true;
    };
    const getEmptyValue = ({ type }) => {
        if (type === 'checkbox')
            return false;
        if (type === 'textbox' || type === 'select')
            return '';
        if (type === 'integer')
            return 0;
    };
    const getFormValues = () => {
        const values = {};
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
        set value(value) {
        },
        get formData() {
            return new FormData(form);
        },
    };
};
const fields = [
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
