
type Field = Textbox | Textarea | Checkbox | Select | NumericTextbox | Integer | Decimal | CheckboxGroup | RadioGroup;

type FieldBase = {
	type: 'textbox' | 'textarea' | 'checkbox' | 'select' | 'numerictextbox' | 'integer' | 'decimal' | 'checkboxgroup' | 'radiogroup';
	name: string;
	label: string;
	visible?: Rule[] | boolean;
	required?: Rule[] | boolean;
	disabled?: Rule[] | boolean;
	valid?: Rule[];
}

type Textbox = FieldBase & {
	type: 'textbox';
	value?: string;
	placeholder?: string;
	minLength?: number;
	maxLength?: number;
}

type Textarea = FieldBase & {
	type: 'textarea';
	value?: string;
	placeholder?: string;
	minLength?: number;
	maxLength?: number;
}

type Checkbox = FieldBase & {
	type: 'checkbox';
	value?: boolean;
}

type NumericTextbox = FieldBase & {
	type: 'numerictextbox';
	value?: string;
	placeholder?: string;
	minLength?: number;
	maxLength?: number;
}

type Integer = FieldBase & {
	type: 'integer';
	value?: number;
	placeholder?: string;
	min?: number;
	max?: number;
}

type Decimal = FieldBase & {
	type: 'decimal';
	value?: number;
	placeholder?: string;
	min?: number;
	max?: number;
}

// Optgroups / Disabled options
type Select = FieldBase & {
	type: 'select';
	options: {
		text: string;
		value: string;
	}[];
	value?: string;
	placeholder?: string;
}

type CheckboxGroup = FieldBase & {
	type: 'checkboxgroup';
	options: {
		text: string;
		value: string;
	}[];
	min?: number;
	max?: number
	value?: string[];
}

type RadioGroup = FieldBase & {
	type: 'radiogroup';
	options: {
		text: string;
		value: string;
	}[];
	value?: string;
}

// Repeatable fields? Or repeatable "types" eg dynamic list textbox
// Conditional sections
// Repeatable sections

// Possibly add error strings for each

type Value = boolean | string | number | string[];
type VarRef = { var: string }; // e.g. { "var": "fieldName" }
type EqualsRule = { '==': [Value | VarRef, Value | VarRef] };
type NotEqualsRule = { '!=': [Value | VarRef, Value | VarRef] };
type LessThanRule = { '<': [Value | VarRef, Value | VarRef] };
type LessThanOrEqualToRule = { '<=': [Value | VarRef, Value | VarRef] };
type GreaterThanRule = { '>': [Value | VarRef, Value | VarRef] };
type GreaterThanOrEqualToRule = { '>=': [Value | VarRef, Value | VarRef] };

// metarules
type AndRule = { and: Rule[] };
type OrRule = { or: Rule[] };
type NotRule = { not: Rule }; // { not: { '==': [{ var: 'fieldName' }, 'fieldValue'] } }

type Rule = EqualsRule | NotEqualsRule | LessThanRule | LessThanOrEqualToRule | GreaterThanRule | GreaterThanOrEqualToRule | AndRule | OrRule | NotRule;

type Config = {
	title: string;
	fields: Field[];
	//fields: Field[] | Section[];
}

type Section = Config & {
	visible?: Rule[] | boolean;
	// repeatable
}

const Form = (config: Config) => {

	type FieldInternal = {
		readonly type: FieldBase['type'];
		readonly el: HTMLDivElement;
		readonly name: string;
		readonly visible: boolean;
		readonly required: boolean;
		readonly disabled: boolean;
		value: Value;
		updateState(): void;
	};

	// field name => internal object
	const FIELDS: Record<string, FieldInternal> = {};
	// field name => subscriber names
	const WATCHERS: Record<string, Set<string>> = {};

	const buildField = (f: Field) => {
		if (f.name in FIELDS) throw new Error(`"${f.name}" exists in the config twice. Can't have two fields named the same.`)
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
		let input: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | HTMLFieldSetElement;
		let getValue: () => Value;
		let setValue: (val: any) => any;
		let setRequired: (bool: boolean) => void;
		let setValid: (bool: boolean) => void;
		let eventToListenFor: 'change' | 'input' = 'change';

		if (f.type === 'textbox' || f.type === 'textarea') {
			eventToListenFor = 'input'
			input = document.createElement(f.type === 'textbox' ? 'input' : 'textarea');
			if (f.type === 'textbox') (input as HTMLInputElement).type = 'text';
			input.id = id;
			input.name = f.name;
			input.defaultValue = f.value ?? '';
			if (f.placeholder) input.placeholder = f.placeholder;
			if (f.maxLength && isInteger(f.maxLength)) input.maxLength = f.maxLength;
			if (f.minLength && isInteger(f.minLength)) input.minLength = f.minLength;
			div.replaceChildren(label, input);
			getValue = () => (input as (HTMLInputElement | HTMLTextAreaElement)).value.trim();
			setValue = (val: string) => (input as (HTMLInputElement | HTMLTextAreaElement)).value = typeof val === 'string' ? val.trim() : '';
			setRequired = (bool) => {
				(input as (HTMLInputElement | HTMLTextAreaElement)).required = !!bool;
				//(input as HTMLInputElement).pattern = !!bool ? `^\s*\S.*$` : '';
			};
			setValid = (bool) => {
				let validityMessage = '';
				if (!bool) {
					validityMessage = 'This field is invalid.';
				}
				input.setCustomValidity(validityMessage);
			};
			// handle custom validity on input or set value
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
			getValue = () => !!(input as HTMLInputElement).checked;
			setValue = (val) => (input as HTMLInputElement).checked = !!val;
			setRequired = (bool) => (input as HTMLInputElement).required = !!bool;
		}
		else if (f.type === 'integer' || f.type === 'decimal') {
			const intKeys = new Set([
				'Backspace',
				'Delete',
				'ArrowLeft',
				'ArrowRight',
				'ArrowUp',
				'ArrowDown',
				'Tab',
				'Home',
				'End',
				'1', '2', '3', '4', '5', '6', '7', '8', '9', '0'
			]);
			const metaKeys = new Set(['a', 'c', 'v', 'x']);
			const maxLength = String(f.max ?? 100000).length;
			eventToListenFor = 'input'
			input = document.createElement('input');
			input.id = id;
			input.name = f.name;
			input.type = 'number';
			input.placeholder = f.placeholder ?? '';
			if (isNumeric(f.value)) {
				input.defaultValue = String(f.value);
			}
			if (isNumeric(f.max) && isNumeric(f.min) && f.min > f.max) {
				f.max = f.min;
			}
			if (isNumeric(f.max)) {
				input.max = String(Math.floor(f.max));
				//input.maxLength = input.max.length; // Doesn't work. Needs keydown handler
			}
			if (isNumeric(f.min)) {
				input.min = String(Math.floor(f.min));
				//if (f.min > 0) input.minLength = input.min.length;
			}
			// set value somewhere
			// Keydown and input handlers to fix int and dec
			div.replaceChildren(label, input);

			input.addEventListener('keydown', (e) => {
				if (intKeys.has(e.key)) return;
				if ((e.ctrlKey || e.metaKey) && metaKeys.has(e.key.toLowerCase())) return;
				// Ordering of this makes no sense
				e.preventDefault(); // Block
			});
			// input.addEventListener('keydown', (e) => {
			// 	if ((input as HTMLInputElement).value.length >= maxLength) e.preventDefault();
			// });
			input.addEventListener('input', () => {
				// Clean on paste, drag, etc
				(input as HTMLInputElement).value = (input as HTMLInputElement).value.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
				//(input as HTMLInputElement).value = (input as HTMLInputElement).value.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
			})


			getValue = () => (input as HTMLInputElement).valueAsNumber; // Maybe
			setRequired = (bool) => (input as HTMLInputElement).required = !!bool;
			setValue = (val: number) => {
				(input as HTMLInputElement).value = typeof val === 'number' && isFinite(val) ? String(f.type === 'integer' ? Math.floor(val) : val) : '0';
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
			getValue = () => validValues.has((input as HTMLSelectElement).value) ? (input as HTMLSelectElement).value : '';
			setValue = (val: string) => (input as HTMLSelectElement).value = validValues.has(val) ? val : '';
			setRequired = (bool) => (input as HTMLSelectElement).required = !!bool;
		}
		else if (f.type === 'checkboxgroup') {
			const validValues = new Set(f.options.map(o => o.value));
			const selectedValues = new Set(f.value ?? []);
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
				checkbox.defaultChecked = selectedValues.has(o.value);
				input.append(label);
				return checkbox;
			});
			if (typeof f.min === 'number' || typeof f.max === 'number') {

			}
			input.addEventListener('change', () => {
				if (typeof f.min !== 'number' && typeof f.max !== 'number') return;
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
			setValue = (val: string[] = []) => {
				const set = new Set(val.filter(v => validValues.has(v)));
				for (const checkbox of checkboxes) {
					checkbox.checked = set.has(checkbox.value);
				}
			};
			setRequired = (bool) => {
				for (const checkbox of checkboxes) {
					checkbox.required = !!bool;
				}
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
			setValue = (val: string) => {
				for (const radio of radios) {
					radio.checked = val === radio.value;
				}
			}
			setRequired = (bool) => {
				for (const radio of radios) {
					radio.required = !!bool;
				}
			};
		}
		else {
			throw new Error(`field ${(f as Field).name} type invalid`);
		}



		// Stretch across entire grid if it's conditionally displayed. Otherwise, you get fields moving around left/right
		if (typeof f.visible === 'boolean' || Array.isArray(f.visible)) {
			//div.style.gridColumn = '1/-1';
			// div.style.transition = 'height .1s ease-out';
			// div.style.overflow = 'hidden';
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

		const internals: FieldInternal = {
			get type() {
				return f.type;
			},
			get name() {
				return f.name;
			},
			get value() {
				if (_disabled || !_visible) return getEmptyValue(this);
				return getValue();
			},
			set value(val: Value) {
				setValue(val);
				fireRecursiveDependencyUpdate(f.name);
			},
			//visible: true,
			get visible() {
				// These probably don't need to be getters
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
					//div.style.height = '';
				}
				else {
					div.style.display = 'none';
					//div.style.height = '0px';
				}
				requiredSpan.style.display = _required ? '' : 'none';
				setRequired(_required);
				input.disabled = _disabled || !_visible;
				//setValid(_valid);
			}
		}

		FIELDS[f.name] = internals;

		return internals;
	};

	const isNumeric = (val: unknown): val is Number => {
		return typeof val === 'number' && !Number.isNaN(val) && isFinite(val);
	};

	const isInteger = (val: unknown): boolean => {
		return isNumeric(val) && Number.isSafeInteger(val);
	}

	const isDecimal = (val: unknown): boolean => {
		return isNumeric(val) && !Number.isSafeInteger(val);
	}

	const isVarRef = (val: unknown): val is VarRef => {
		return (!!val && typeof val === 'object' && 'var' in val && typeof val.var === 'string');
	}

	// To implement contextual rules that compare against current day, etc., will need custom operators with context:
	// const context = {
	//   today: new Date(),
	//   // etc.
	// };
	// then compare against that

	/** Repetitive loop to return a set of strings. Can probably be simplified if I look up by key */
	const getFieldNamesToWatch = (field: Field): Set<string> => {
		const resultSet = new Set<string>();

		const collectVars = (rule: Rule) => {
			if ('==' in rule) {
				for (const item of rule['==']) if (isVarRef(item)) resultSet.add(item.var);
			}
			else if ('!=' in rule) {
				for (const item of rule['!=']) if (isVarRef(item)) resultSet.add(item.var);
			}
			else if ('>' in rule) {
				for (const item of rule['>']) if (isVarRef(item)) resultSet.add(item.var);
			}
			else if ('<' in rule) {
				for (const item of rule['<']) if (isVarRef(item)) resultSet.add(item.var);
			}
			else if ('>=' in rule) {
				for (const item of rule['>=']) if (isVarRef(item)) resultSet.add(item.var);
			}
			else if ('<=' in rule) {
				for (const item of rule['<=']) if (isVarRef(item)) resultSet.add(item.var);
			}
			else if ('not' in rule) {
				collectVars(rule.not);
			}
			else if ('and' in rule) {
				for (const r of rule.and) collectVars(r);
			}
			else if ('or' in rule) {
				for (const r of rule.or) collectVars(r);
			}
		};

		const collectAllVarNames = (rules: Rule[] | boolean | undefined) => {
			// A property like "required" might not exist or just be a boolean so we do this
			if (!Array.isArray(rules)) return;
			for (const r of rules) {
				collectVars(r);
			}
		};

		// Get dependencies from each thing
		collectAllVarNames(field.visible);
		collectAllVarNames(field.required);
		collectAllVarNames(field.disabled);
		return resultSet;
	};

	/** 
	 * Figures out what a property (required, visible, etc.) should be based on current form state.
	 * Returns default if not defined. This is constantly run as the form updates
	 */
	const evaluateProperty = (propertyVal: Rule[] | boolean | undefined, defaultValue: boolean): boolean => {
		if (typeof propertyVal === 'boolean') return propertyVal;
		if (Array.isArray(propertyVal)) return propertyVal.every(rule => evaluateRule(rule));
		return defaultValue;
	};

	/** 
		Interprets a side of a rule so we can compare the two sides
	*/
	const readRuleSide = (side: VarRef | Value): Value => {
		if (isVarRef(side)) {
			return FIELDS[side.var].value as Value;
		}
		// Is already some kind of value (ValueType) so we return that.
		return side;
	}

	const isFlatStringArrayEqual = (array1: string[], array2: string[]) => {
		// Compare string value arrays for checkbox groups, etc. We don't care about order
		// Remove duplicates with Set since declaring a value twice on a group should still work the same as once.
		array1 = [...new Set(array1)].toSorted();
		array2 = [...new Set(array2)].toSorted();
		return array1.length === array2.length && array1.every((item, i) => item === array2[i]);
	};

	/** Makes a rule comparison: field value against a set value or another field value. 
	 * A little repetitive, but it's easier to understand doing the operations one by one like this compared to a lookup
	 * Also needs some type checking, maybe, or else you can do weird things like 'a' < 'aa' etc? This is probably ok
	 *  Does check for arrays*/

	const evaluateRule = (rule: Rule): boolean => {

		if ('==' in rule) {
			const [left, right] = rule['=='];
			// Comparison will not work for arrays
			const side1 = readRuleSide(left);
			const side2 = readRuleSide(right);
			if (Array.isArray(side1) && Array.isArray(side2)) return isFlatStringArrayEqual(side1, side2);
			return side1 === side2;
		}
		if ('!=' in rule) {
			const [left, right] = rule['!='];
			const side1 = readRuleSide(left);
			const side2 = readRuleSide(right);
			if (Array.isArray(side1) && Array.isArray(side2)) return isFlatStringArrayEqual(side1, side2) === false;
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
			// A not rule looks like { not: { '==': [{ var: 'fieldName' }, 'fieldValue'] } }
			// True if it returns false
			return evaluateRule(rule.not) === false;
		}
		// These are collections of other rules, so we use recursion here
		if ('and' in rule) {
			// Everything has to return true
			return rule.and.every((r) => evaluateRule(r));
		}
		if ('or' in rule) {
			// True if one returns true
			return rule.or.some((r) => evaluateRule(r));
		}

		return true;
	};

	const getEmptyValue = ({ type }: FieldInternal) => {
		if (type === 'checkbox') return false;
		if (type === 'integer' || type === 'decimal') return 0;
		if (type === 'checkboxgroup') return [] as string[];
		return '';
	};


	/** Update dependent fields, then update fields that are dependent on those, etc. */
	const fireRecursiveDependencyUpdate = (fieldName: string) => {
		if (!(WATCHERS[fieldName] instanceof Set)) return;
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

	const buttonRow = document.createElement('div');
	buttonRow.replaceChildren(submitButton);

	// use create null so you have no prototype properties in the way.
	const valueGetterObject = Object.create(null);
	for (const f of config.fields) {
		const fieldInternal = buildField(f);
		// Several layers of getter/setters here, probably one can be removed
		Object.defineProperty(valueGetterObject, f.name, {
			get() {
				return fieldInternal.value;
			},
			set(value: Value) {
				fieldInternal.value = value;
			},
			enumerable: true,
		});
		form.append(fieldInternal.el);
	}

	form.append(buttonRow);


	// Update everything once after creating form
	for (const fieldInternal of Object.values(FIELDS)) {
		fieldInternal.updateState();
	}

	const states: Record<string, typeof valueGetterObject> = {};

	return {
		el: form,
		get value() {
			// Returned directly individual properties can be set
			return valueGetterObject;
		},
		set value(val: Record<string, Value>) {
			for (const key in val) {
				FIELDS[key].value = val[key];
			}
		},
		clear() {
			for (const f of Object.values(FIELDS)) {
				f.value = getEmptyValue(f);
			}
			return this.value;
		},
		reset() {
			form.reset();
			for (const fieldInternal of Object.values(FIELDS)) {
				fieldInternal.updateState();
			}
			return this.value;
		},
		get json() {
			return JSON.stringify(valueGetterObject);
		},
		get formData() {
			return new FormData(form);
		},
		saveState(name: string) {
			const clone = structuredClone(valueGetterObject);
			states[name] = clone;
			return clone;
		},
		loadState(name: string) {
			const value = states[name];
			if (!value) return;
			this.value = value;
			return structuredClone(value);
		}
	};
};

