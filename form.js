"use strict";
const Form = (config) => {
    const FIELDS = {};
    const WATCHERS = {};
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
        for (const fieldName of getFieldNamesToWatch(f)) {
            if (!(WATCHERS[fieldName] instanceof Set)) {
                WATCHERS[fieldName] = new Set();
            }
            WATCHERS[fieldName].add(f.name);
        }
        if (f.type === 'checkbox' || f.type === 'select') {
            input.addEventListener('change', () => {
                input.dispatchEvent(new CustomEvent('form-update', { bubbles: true, detail: internals }));
            });
        }
        else {
            input.addEventListener('input', () => {
                input.dispatchEvent(new CustomEvent('form-update', { bubbles: true, detail: internals }));
            });
        }
        const internals = {
            get type() {
                return f.type;
            },
            get name() {
                return f.name;
            },
            get value() {
                if (_disabled || !_visible)
                    return getEmptyValue(this);
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
            updateState() {
                _visible = evaluateProperty(f.visible, true);
                _disabled = evaluateProperty(f.disabled, false);
                _required = evaluateProperty(f.required, false);
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
    const getFieldNamesToWatch = (field) => {
        const set = new Set();
        const extractVar = (val) => {
            if (val && typeof val === 'object' && 'var' in val && typeof val.var === 'string') {
                set.add(val.var);
            }
        };
        const walkRule = (rule) => {
            if ('==' in rule) {
                const [left, right] = rule['=='];
                extractVar(left);
                extractVar(right);
            }
            else if ('!=' in rule) {
                const [left, right] = rule['!='];
                extractVar(left);
                extractVar(right);
            }
            else if ('>' in rule) {
                const [left, right] = rule['>'];
                extractVar(left);
                extractVar(right);
            }
            else if ('<' in rule) {
                const [left, right] = rule['<'];
                extractVar(left);
                extractVar(right);
            }
            else if ('>=' in rule) {
                const [left, right] = rule['>='];
                extractVar(left);
                extractVar(right);
            }
            else if ('<=' in rule) {
                const [left, right] = rule['<='];
                extractVar(left);
                extractVar(right);
            }
            else if ('and' in rule) {
                rule.and.forEach(walkRule);
            }
            else if ('or' in rule) {
                rule.or.forEach(walkRule);
            }
            else if ('not' in rule) {
                walkRule(rule.not);
            }
        };
        const walkRulesArray = (rules) => {
            if (Array.isArray(rules))
                rules.forEach(walkRule);
        };
        walkRulesArray(field.visible);
        walkRulesArray(field.required);
        walkRulesArray(field.disabled);
        return set;
    };
    const evaluateProperty = (propertyVal, defaultValue) => {
        if (typeof propertyVal === 'boolean')
            return propertyVal;
        if (Array.isArray(propertyVal))
            return propertyVal.every(rule => evaluateRule(rule));
        return defaultValue;
    };
    const readRuleSide = (side) => {
        if (!!side && typeof side === 'object' && 'var' in side) {
            return FIELDS[side.var].value;
        }
        return side;
    };
    const evaluateRule = (rule) => {
        if ('==' in rule) {
            const [left, right] = rule['=='];
            return readRuleSide(left) === readRuleSide(right);
        }
        if ('!=' in rule) {
            const [left, right] = rule['!='];
            return readRuleSide(left) !== readRuleSide(right);
        }
        if ('>' in rule) {
            const [left, right] = rule['>'];
            return readRuleSide(left) > readRuleSide(right);
        }
        if ('<' in rule) {
            const [left, right] = rule['<'];
            return readRuleSide(left) < readRuleSide(right);
        }
        if ('>=' in rule) {
            const [left, right] = rule['>='];
            return readRuleSide(left) >= readRuleSide(right);
        }
        if ('<=' in rule) {
            const [left, right] = rule['<='];
            return readRuleSide(left) <= readRuleSide(right);
        }
        if ('not' in rule) {
            return !evaluateRule(rule.not);
        }
        if ('and' in rule) {
            return rule.and.every((r) => evaluateRule(r));
        }
        if ('or' in rule) {
            return rule.or.some((r) => evaluateRule(r));
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
            values[fieldInternal.name] = fieldInternal.value;
        }
        return values;
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
    form.addEventListener('form-update', (e) => {
        e.stopPropagation();
        const fieldInternalThatChanged = e.detail;
        if (!(WATCHERS[fieldInternalThatChanged.name] instanceof Set))
            return;
        for (const fieldName of WATCHERS[fieldInternalThatChanged.name]) {
            FIELDS[fieldName].updateState();
        }
    });
    for (const fieldInternal of Object.values(FIELDS)) {
        fieldInternal.updateState();
    }
    return {
        el: form,
        get value() {
            return getFormValues();
        },
        get formData() {
            return new FormData(form);
        },
    };
};
