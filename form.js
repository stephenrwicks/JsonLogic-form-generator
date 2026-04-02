"use strict";
const Form = (config) => {
    const keys = ['==', '!=', '<', '<=', '>', '>=', 'and', 'or', 'not'];
    const FIELDS = {};
    const WATCHERS = {};
    const buildField = (f) => {
        const id = `_${crypto.randomUUID()}`;
        const div = document.createElement('div');
        const label = document.createElement('label');
        const labelSpan = document.createElement('span');
        const requiredSpan = document.createElement('span');
        label.htmlFor = id;
        labelSpan.textContent = f.label;
        requiredSpan.textContent = ' *';
        requiredSpan.style.color = 'red';
        requiredSpan.ariaHidden = 'true';
        label.replaceChildren(labelSpan, requiredSpan);
        let input;
        let getValue;
        let setValue;
        if (f.type === 'checkbox') {
            input = document.createElement('input');
            input.id = id;
            input.name = f.name;
            input.type = 'checkbox';
            input.checked = !!f.value;
            const wrapperSpan = document.createElement('span');
            wrapperSpan.replaceChildren(labelSpan, requiredSpan);
            label.replaceChildren(input, wrapperSpan);
            label.style.display = 'flex';
            div.replaceChildren(label);
            div.style.alignContent = 'end';
            getValue = () => !!input.checked;
            setValue = (val) => input.checked = !!val;
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
            div.replaceChildren(label, input);
            getValue = () => input.value.trim();
            setValue = (val) => input.value = val?.trim() || '';
        }
        else if (f.type === 'select') {
            input = document.createElement('select');
            input.id = id;
            input.name = f.name;
            input.add(new Option(f.placeholder || '-', '', false));
            for (const option of f.options) {
                input.add(new Option(option.text, option.value, option.value === f.value));
            }
            div.replaceChildren(label, input);
            const validValues = new Set(f.options.map(o => o.value));
            getValue = () => validValues.has(input.value) ? input.value : '';
            setValue = (val) => input.value = validValues.has(val) ? val : '';
        }
        else {
            throw new Error(`field ${f.name} type invalid`);
        }
        let _visible = true;
        let _disabled = false;
        let _required = false;
        if (typeof f.visible === 'boolean' || Array.isArray(f.visible)) {
        }
        for (const fieldName of getFieldNamesToWatch(f)) {
            if (!(WATCHERS[fieldName] instanceof Set)) {
                WATCHERS[fieldName] = new Set();
            }
            WATCHERS[fieldName].add(f.name);
        }
        if (f.type === 'checkbox' || f.type === 'select') {
            input.addEventListener('change', () => {
                fireRecursiveDependencyUpdate(f.name);
            });
        }
        else {
            input.addEventListener('input', () => {
                fireRecursiveDependencyUpdate(f.name);
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
            set value(val) {
                setValue(val);
                fireRecursiveDependencyUpdate(f.name);
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
                requiredSpan.style.display = _required ? '' : 'none';
                input.required = _required;
                input.disabled = _disabled || !_visible;
            }
        };
        FIELDS[f.name] = internals;
        return internals;
    };
    const getFieldNamesToWatch = (field) => {
        const resultSet = new Set();
        const addVarIfExists = (val) => {
            if (val && typeof val === 'object' && 'var' in val && typeof val.var === 'string') {
                resultSet.add(val.var);
            }
        };
        const collectVars = (rule) => {
            if ('==' in rule) {
                const [left, right] = rule['=='];
                addVarIfExists(left);
                addVarIfExists(right);
            }
            else if ('!=' in rule) {
                const [left, right] = rule['!='];
                addVarIfExists(left);
                addVarIfExists(right);
            }
            else if ('>' in rule) {
                const [left, right] = rule['>'];
                addVarIfExists(left);
                addVarIfExists(right);
            }
            else if ('<' in rule) {
                const [left, right] = rule['<'];
                addVarIfExists(left);
                addVarIfExists(right);
            }
            else if ('>=' in rule) {
                const [left, right] = rule['>='];
                addVarIfExists(left);
                addVarIfExists(right);
            }
            else if ('<=' in rule) {
                const [left, right] = rule['<='];
                addVarIfExists(left);
                addVarIfExists(right);
            }
            else if ('not' in rule) {
                collectVars(rule.not);
            }
            else if ('and' in rule) {
                for (const r of rule.and) {
                    collectVars(r);
                }
            }
            else if ('or' in rule) {
                for (const r of rule.or) {
                    collectVars(r);
                }
            }
        };
        const collectAllVarNames = (rules) => {
            if (!Array.isArray(rules))
                return;
            for (const r of rules) {
                collectVars(r);
            }
        };
        collectAllVarNames(field.visible);
        collectAllVarNames(field.required);
        collectAllVarNames(field.disabled);
        return resultSet;
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
    const evaluateRule = (rule, thingToDo = 'evaluate') => {
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
            return evaluateRule(rule.not) === false;
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
    const form = document.createElement('form');
    const titleEl = document.createElement('p');
    titleEl.textContent = config.title?.trim() ?? '';
    titleEl.style.gridColumn = '1/-1';
    form.append(titleEl);
    const submitButton = document.createElement('button');
    submitButton.type = 'submit';
    submitButton.textContent = 'Submit';
    const buttonRow = document.createElement('div');
    buttonRow.replaceChildren(submitButton);
    const valueObject = Object.create(null);
    for (const f of config.fields) {
        const fieldInternal = buildField(f);
        Object.defineProperty(valueObject, f.name, {
            get() {
                return fieldInternal.value;
            },
            set(value) {
                fieldInternal.value = value;
            },
            enumerable: true,
        });
        form.append(fieldInternal.el);
    }
    form.append(buttonRow);
    const fireRecursiveDependencyUpdate = (fieldName) => {
        if (!(WATCHERS[fieldName] instanceof Set))
            return;
        for (const watcherName of WATCHERS[fieldName]) {
            FIELDS[watcherName].updateState();
            if (WATCHERS[watcherName] instanceof Set) {
                fireRecursiveDependencyUpdate(watcherName);
            }
        }
    };
    for (const fieldInternal of Object.values(FIELDS)) {
        fieldInternal.updateState();
    }
    return {
        el: form,
        get value() {
            return valueObject;
        },
        get json() {
            return JSON.stringify(valueObject);
        },
        get formData() {
            return new FormData(form);
        },
    };
};
