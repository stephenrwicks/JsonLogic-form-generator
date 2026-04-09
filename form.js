"use strict";
const Form = (config) => {
    const FIELDS = {};
    const WATCHERS = {};
    const blockWhiteSpace = ".*\\S.*";
    const metaKeys = new Set(['a', 'c', 'v', 'x']);
    const integerAllowedKeys = new Set([
        'Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Tab', 'Home', 'End',
        '1', '2', '3', '4', '5', '6', '7', '8', '9', '0'
    ]);
    const buildField = (f) => {
        if (f.name in FIELDS)
            throw new Error(`"${f.name}" exists in the config twice. Can't have two fields named the same.`);
        const id = `_${crypto.randomUUID()}`;
        const div = document.createElement('div');
        const label = document.createElement('label');
        const labelSpan = document.createElement('span');
        const requiredSpan = document.createElement('span');
        label.htmlFor = id;
        labelSpan.textContent = f.label.trim();
        requiredSpan.textContent = ' *';
        requiredSpan.style.color = 'red';
        requiredSpan.ariaHidden = 'true';
        label.replaceChildren(labelSpan, requiredSpan);
        let input;
        let getValue;
        let setValue;
        let setRequired;
        let setValid;
        let eventToListenFor = 'change';
        if (f.type === 'textbox' || f.type === 'textarea') {
            eventToListenFor = 'input';
            input = document.createElement(f.type === 'textbox' ? 'input' : 'textarea');
            if (f.type === 'textbox')
                input.type = 'text';
            input.id = id;
            input.name = f.name;
            if (f.value)
                input.defaultValue = f.value ?? '';
            if (f.placeholder)
                input.placeholder = f.placeholder;
            if (f.maxLength && isInteger(f.maxLength))
                input.maxLength = f.maxLength;
            if (f.minLength && isInteger(f.minLength))
                input.minLength = f.minLength;
            div.replaceChildren(label, input);
            getValue = () => input.value.trim();
            setValue = (val) => input.value = typeof val === 'string' ? val.trim() : '';
            setRequired = (bool) => {
                input.required = !!bool;
                input.pattern = !!bool ? blockWhiteSpace : '';
            };
            setValid = (bool) => {
                let validityMessage = '';
                if (!bool) {
                    validityMessage = 'This field is invalid.';
                }
                input.setCustomValidity(validityMessage);
            };
        }
        else if (f.type === 'checkbox') {
            input = document.createElement('input');
            input.id = id;
            input.name = f.name;
            input.type = 'checkbox';
            input.defaultChecked = !!f.value;
            const wrapperSpan = document.createElement('span');
            wrapperSpan.replaceChildren(labelSpan, requiredSpan);
            label.replaceChildren(input, wrapperSpan);
            label.style.display = 'flex';
            div.replaceChildren(label);
            div.style.alignContent = 'end';
            getValue = () => !!input.checked;
            setValue = (val) => input.checked = !!val;
            setRequired = (bool) => input.required = !!bool;
        }
        else if (f.type === 'integer' || f.type === 'decimal') {
            const maxLength = String(f.max).length || 10;
            eventToListenFor = 'input';
            input = document.createElement('input');
            input.id = id;
            input.name = f.name;
            input.type = 'number';
            input.placeholder = f.placeholder ?? '';
            const hasMin = isNumeric(f.min);
            const hasMax = isNumeric(f.max);
            if (isNumeric(f.value)) {
                input.defaultValue = String(f.value);
            }
            if (hasMin && hasMax && f.min > f.max) {
                f.max = f.min;
            }
            if (hasMax) {
                input.max = String(Math.floor(f.max));
            }
            if (hasMin) {
                input.min = String(Math.floor(f.min));
            }
            div.replaceChildren(label, input);
            input.addEventListener('keydown', (e) => {
                if (integerAllowedKeys.has(e.key))
                    return;
                if ((e.ctrlKey || e.metaKey) && metaKeys.has(e.key.toLowerCase()))
                    return;
                e.preventDefault();
            });
            input.addEventListener('input', () => {
                input.value = input.value.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
            });
            getValue = () => {
                const val = input.valueAsNumber;
                if (isNumeric(val)) {
                    if (f.type === 'decimal')
                        return val;
                    return Math.floor(val);
                }
                return 0;
            };
            setRequired = (bool) => input.required = !!bool;
            setValue = (val) => {
                if (!isNumeric(val)) {
                    input.valueAsNumber = 0;
                    return;
                }
                input.valueAsNumber = f.type === 'integer' ? Math.floor(val) : val;
            };
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
            setRequired = (bool) => input.required = !!bool;
        }
        else if (f.type === 'checkboxgroup') {
            const validValues = new Set(f.options.map(o => o.value));
            const defaultSelectedValues = new Set(f.value ?? []);
            input = document.createElement('fieldset');
            input.id = id;
            const legend = document.createElement('legend');
            const requiredSpan = document.createElement('span');
            requiredSpan.textContent = ' *';
            requiredSpan.style.color = 'red';
            requiredSpan.ariaHidden = 'true';
            legend.replaceChildren(f.label.trim(), requiredSpan);
            input.append(legend);
            div.replaceChildren(input);
            if (typeof f.max === 'number' && typeof f.min === 'number' && f.min > f.max) {
                f.max = f.min;
            }
            const checkboxes = f.options.map(o => {
                const checkbox = document.createElement('input');
                const label = document.createElement('label');
                label.replaceChildren(checkbox, o.text);
                checkbox.type = 'checkbox';
                checkbox.name = f.name;
                checkbox.value = o.value;
                checkbox.defaultChecked = defaultSelectedValues.has(o.value);
                input.append(label);
                return checkbox;
            });
            if (typeof f.min === 'number' || typeof f.max === 'number') {
            }
            input.addEventListener('change', () => {
                if (typeof f.min !== 'number' && typeof f.max !== 'number')
                    return;
                let minMaxValidity = '';
                const selectionLength = checkboxes.filter(c => c.checked && validValues.has(c.value)).length;
                if (typeof f.min === 'number' && selectionLength < Math.floor(f.min)) {
                    minMaxValidity = `Select at least ${f.min} option(s).`;
                }
                else if (typeof f.max === 'number' && selectionLength > Math.floor(f.max)) {
                    minMaxValidity = `Select up to ${f.max} options(s).`;
                }
                if (checkboxes.length) {
                    checkboxes[0].setCustomValidity(minMaxValidity);
                }
            });
            getValue = () => checkboxes.filter(c => c.checked && validValues.has(c.value)).map(c => c.value);
            setValue = (val = []) => {
                const set = new Set(val.filter(v => validValues.has(v)));
                for (const checkbox of checkboxes) {
                    checkbox.checked = set.has(checkbox.value);
                }
            };
            setRequired = (bool) => {
                for (const checkbox of checkboxes) {
                    checkbox.required = !!bool;
                }
                requiredSpan.style.display = !!bool ? '' : 'none';
            };
        }
        else if (f.type === 'radiogroup') {
            const validValues = new Set(f.options.map(o => o.value));
            input = document.createElement('fieldset');
            input.id = id;
            const legend = document.createElement('legend');
            const requiredSpan = document.createElement('span');
            requiredSpan.textContent = ' *';
            requiredSpan.style.color = 'red';
            requiredSpan.ariaHidden = 'true';
            legend.replaceChildren(f.label.trim(), requiredSpan);
            input.append(legend);
            div.replaceChildren(input);
            const radios = f.options.map(o => {
                const radio = document.createElement('input');
                const label = document.createElement('label');
                label.replaceChildren(radio, o.text);
                radio.type = 'radio';
                radio.name = f.name;
                radio.value = o.value;
                radio.defaultChecked = o.value === f.value;
                input.append(label);
                return radio;
            });
            getValue = () => radios.find(r => r.checked && validValues.has(r.value))?.value ?? '';
            setValue = (val) => {
                for (const radio of radios) {
                    radio.checked = val === radio.value;
                }
            };
            setRequired = (bool) => {
                for (const radio of radios) {
                    radio.required = !!bool;
                }
                requiredSpan.style.display = !!bool ? '' : 'none';
            };
        }
        else {
            throw new Error(`field ${f.name} type invalid`);
        }
        for (const fieldName of getFieldNamesToWatch(f)) {
            if (!(WATCHERS[fieldName] instanceof Set)) {
                WATCHERS[fieldName] = new Set();
            }
            WATCHERS[fieldName].add(f.name);
        }
        input.addEventListener(eventToListenFor, () => {
            fireRecursiveDependencyUpdate(f.name);
        });
        let _visible = true;
        let _disabled = false;
        let _required = false;
        let _valid = true;
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
                _valid = evaluateProperty(f.valid, true);
                if (_visible) {
                    div.style.display = '';
                    input.disabled = false || _disabled;
                }
                else {
                    div.style.display = 'none';
                }
                requiredSpan.style.display = _required ? '' : 'none';
                setRequired(_required);
                input.disabled = _disabled || !_visible;
            }
        };
        FIELDS[f.name] = internals;
        return internals;
    };
    const isNumeric = (val) => {
        return typeof val === 'number' && !Number.isNaN(val) && isFinite(val);
    };
    const isInteger = (val) => {
        return isNumeric(val) && Number.isSafeInteger(val);
    };
    const isDecimal = (val) => {
        return isNumeric(val) && !Number.isSafeInteger(val);
    };
    const isVarRef = (val) => {
        return !!val && typeof val === 'object' && 'var' in val && typeof val.var === 'string';
    };
    const getFieldNamesToWatch = (field) => {
        const resultSet = new Set();
        const collectVars = (rule) => {
            if ('==' in rule) {
                for (const item of rule['=='])
                    if (isVarRef(item))
                        resultSet.add(item.var);
            }
            else if ('!=' in rule) {
                for (const item of rule['!='])
                    if (isVarRef(item))
                        resultSet.add(item.var);
            }
            else if ('>' in rule) {
                for (const item of rule['>'])
                    if (isVarRef(item))
                        resultSet.add(item.var);
            }
            else if ('<' in rule) {
                for (const item of rule['<'])
                    if (isVarRef(item))
                        resultSet.add(item.var);
            }
            else if ('>=' in rule) {
                for (const item of rule['>='])
                    if (isVarRef(item))
                        resultSet.add(item.var);
            }
            else if ('<=' in rule) {
                for (const item of rule['<='])
                    if (isVarRef(item))
                        resultSet.add(item.var);
            }
            else if ('not' in rule) {
                collectVars(rule.not);
            }
            else if ('and' in rule) {
                for (const r of rule.and)
                    collectVars(r);
            }
            else if ('or' in rule) {
                for (const r of rule.or)
                    collectVars(r);
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
        if (isVarRef(side)) {
            return FIELDS[side.var].value;
        }
        return side;
    };
    const isFlatStringArrayEqual = (array1, array2) => {
        array1 = [...new Set(array1)].toSorted();
        array2 = [...new Set(array2)].toSorted();
        return array1.length === array2.length && array1.every((item, i) => item === array2[i]);
    };
    const evaluateRule = (rule) => {
        if ('==' in rule) {
            const [left, right] = rule['=='];
            const side1 = readRuleSide(left);
            const side2 = readRuleSide(right);
            if (Array.isArray(side1) && Array.isArray(side2))
                return isFlatStringArrayEqual(side1, side2);
            return side1 === side2;
        }
        if ('!=' in rule) {
            const [left, right] = rule['!='];
            const side1 = readRuleSide(left);
            const side2 = readRuleSide(right);
            if (Array.isArray(side1) && Array.isArray(side2))
                return isFlatStringArrayEqual(side1, side2) === false;
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
        if (type === 'integer' || type === 'decimal')
            return 0;
        if (type === 'checkboxgroup')
            return [];
        return '';
    };
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
    const form = document.createElement('form');
    const titleEl = document.createElement('p');
    titleEl.textContent = config.title?.trim() ?? '';
    titleEl.style.gridColumn = '1/-1';
    form.append(titleEl);
    const submitButton = document.createElement('button');
    submitButton.type = 'submit';
    submitButton.textContent = 'Submit';
    const clear = () => {
        for (const f of Object.values(FIELDS)) {
            f.value = getEmptyValue(f);
        }
        return valueGetterObject;
    };
    const clearButton = document.createElement('button');
    clearButton.type = 'button';
    clearButton.textContent = 'Clear';
    clearButton.addEventListener('click', clear);
    const resetButton = document.createElement('button');
    const reset = () => {
        form.reset();
        for (const fieldInternal of Object.values(FIELDS)) {
            fieldInternal.updateState();
        }
        return valueGetterObject;
    };
    resetButton.type = 'button';
    resetButton.addEventListener('click', reset);
    resetButton.textContent = 'Reset';
    const buttonRow = document.createElement('div');
    buttonRow.replaceChildren(resetButton, clearButton, submitButton);
    const valueGetterObject = Object.create(null);
    for (const f of config.fields) {
        const fieldInternal = buildField(f);
        Object.defineProperty(valueGetterObject, f.name, {
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
    for (const fieldInternal of Object.values(FIELDS)) {
        fieldInternal.updateState();
    }
    const states = {};
    return {
        el: form,
        get value() {
            return valueGetterObject;
        },
        set value(val) {
            for (const key in val) {
                FIELDS[key].value = val[key];
            }
        },
        clear() {
            return clear();
        },
        reset() {
            return reset();
        },
        get json() {
            return JSON.stringify(valueGetterObject);
        },
        get formData() {
            return new FormData(form);
        },
        saveState(name) {
            const clone = structuredClone(valueGetterObject);
            states[name] = clone;
            return clone;
        },
        loadState(name) {
            const value = states[name];
            if (!value)
                return;
            this.value = value;
            return structuredClone(value);
        }
    };
};
