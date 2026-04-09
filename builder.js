"use strict";
const fieldSetup = Form({
    title: 'Edit Field',
    fields: [
        {
            name: 'type',
            label: 'Field Type',
            type: 'select',
            required: true,
            options: [
                { text: 'Textbox', value: 'textbox' },
                { text: 'Checkbox', value: 'checkbox' },
                { text: 'Integer', value: 'integer' },
                { text: 'Decimal', value: 'decimal' },
                { text: 'Textarea', value: 'textarea' },
                { text: 'Numeric Textbox', value: 'numerictextbox' },
                { text: 'Select', value: 'select' },
                { text: 'Checkbox Group', value: 'checkboxgroup' },
                { text: 'Radio Group', value: 'radiogroup' },
            ],
        },
        {
            name: 'name',
            label: 'Name (Form Key)',
            type: 'textbox',
            required: true,
        },
        {
            name: 'label',
            label: 'Label',
            type: 'textbox',
            required: true,
            maxLength: 50,
            placeholder: 'Text to display'
        },
        {
            name: 'options',
            label: 'Options',
            type: 'textbox',
            required: true,
            visible: [
                {
                    or: [
                        { '==': [{ var: 'type' }, 'select'] },
                        { '==': [{ var: 'type' }, 'checkboxgroup'] },
                        { '==': [{ var: 'type' }, 'radiogroup'] },
                    ]
                }
            ],
        },
        {
            name: 'placeholder',
            label: 'Placeholder',
            type: 'textbox',
            maxLength: 30,
            required: false,
            visible: [
                {
                    or: [
                        { '==': [{ var: 'type' }, 'textbox'] },
                        { '==': [{ var: 'type' }, 'textarea'] },
                        { '==': [{ var: 'type' }, 'numerictextbox'] },
                        { '==': [{ var: 'type' }, 'integer'] },
                        { '==': [{ var: 'type' }, 'decimal'] },
                        { '==': [{ var: 'type' }, 'select'] },
                    ]
                }
            ],
        },
        {
            name: 'minlength',
            label: 'Min Length',
            type: 'integer',
            max: 10000,
            required: false,
            visible: [
                {
                    or: [
                        { '==': [{ var: 'type' }, 'textbox'] },
                        { '==': [{ var: 'type' }, 'textarea'] },
                        { '==': [{ var: 'type' }, 'numerictextbox'] },
                    ]
                }
            ],
        },
        {
            name: 'maxlength',
            label: 'Max Length',
            type: 'integer',
            max: 10000000,
            required: false,
            visible: [
                {
                    or: [
                        { '==': [{ var: 'type' }, 'textbox'] },
                        { '==': [{ var: 'type' }, 'textarea'] },
                        { '==': [{ var: 'type' }, 'numerictextbox'] },
                    ]
                }
            ],
        },
        {
            name: 'min',
            label: 'Min',
            type: 'integer',
            min: 0,
            max: 1000000000000000,
            required: false,
            visible: [
                {
                    or: [
                        { '==': [{ var: 'type' }, 'integer'] },
                        { '==': [{ var: 'type' }, 'decimal'] },
                    ]
                }
            ],
        },
        {
            name: 'max',
            label: 'Max',
            type: 'integer',
            min: 1,
            max: 1000000000000000,
            required: false,
            visible: [
                {
                    or: [
                        { '==': [{ var: 'type' }, 'integer'] },
                        { '==': [{ var: 'type' }, 'decimal'] },
                    ]
                }
            ],
        },
        {
            name: 'defaulttextbox',
            label: 'Default Value',
            type: 'textbox',
            required: false,
            visible: [
                {
                    or: [
                        { '==': [{ var: 'type' }, 'textbox'] },
                        { '==': [{ var: 'type' }, 'numerictextbox'] },
                    ]
                }
            ],
        },
        {
            name: 'defaultcheckbox',
            label: 'Checked by default',
            type: 'checkbox',
            required: false,
            value: false,
            visible: [
                { '==': [{ var: 'type' }, 'checkbox'] },
            ],
        },
        {
            name: 'defaulttextarea',
            label: 'Default Value',
            type: 'textarea',
            required: false,
            visible: [
                { '==': [{ var: 'type' }, 'textarea'] },
            ],
        },
        {
            name: 'defaultinteger',
            label: 'Default Value',
            type: 'integer',
            required: false,
            visible: [
                {
                    or: [
                        { '==': [{ var: 'type' }, 'integer'] },
                    ]
                }
            ],
        },
        {
            name: 'defaultdecimal',
            label: 'Default Value',
            type: 'integer',
            required: false,
            visible: [
                { '==': [{ var: 'type' }, 'decimal'] },
            ],
        },
        {
            name: 'defaultselect',
            label: 'Default Value',
            type: 'select',
            required: false,
            visible: [
                { '==': [{ var: 'type' }, 'select'] },
            ],
            options: []
        },
    ]
});
document.body.append(fieldSetup.el);
fieldSetup.el.addEventListener('submit', (e) => {
    e.preventDefault();
    const defaultValue = fieldSetup.value[`default${fieldSetup.value.type}`];
    const result = {
        ...fieldSetup.value,
        value: defaultValue,
    };
    console.log(result);
});
