
type Field = Textbox | Checkbox | Select | Integer | Decimal | CheckboxGroup | RadioGroup;

type FieldBase = {
	type: 'textbox' | 'checkbox' | 'select' | 'integer' | 'decimal' | 'checkboxgroup' | 'radiogroup';
	name: string; // Object property name
	label: string;
	//sortOrder?: number;
	// tooltip?: string | string[];
	visible?: Rule[] | boolean;
	required?: Rule[] | boolean;
	disabled?: Rule[] | boolean;
	valid?: Rule[];
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

type Decimal = FieldBase & {
	type: 'decimal';
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

type CheckboxGroup = FieldBase & {
	type: 'checkboxgroup';
	options: {
		text: string;
		value: string;
	}[];
	min?: number;
	max?: number
	value?: string[];
};

type RadioGroup = FieldBase & {
	type: 'radiogroup';
	options: {
		text: string;
		value: string;
	}[];
	value?: string;
};

// Repeatable fields? Or repeatable "types" eg dynamic list textbox
// Conditional sections
// Repeatable sections

// Possibly add error strings for each

// If arrays are allowed as values, how do we compare them?

type ValueType = boolean | string | number; // What we collect from fields. Will need to add array? How to compare arrays?
type VarRef = { var: string }; // e.g. { "var": "fieldName" }
type EqualsRule = { '==': [VarRef, ValueType] };
type NotEqualsRule = { '!=': [VarRef, ValueType] };
type LessThanRule = { '<': [VarRef, ValueType] };
type LessThanOrEqualToRule = { '<=': [VarRef, ValueType] };
type GreaterThanRule = { '>': [VarRef, ValueType] };
type GreaterThanOrEqualToRule = { '>=': [VarRef, ValueType] };

// metarules
type AndRule = { and: Rule[] };
type OrRule = { or: Rule[] };
type NotRule = { not: Rule }; // { not: { '==': [{ var: 'fieldName' }, 'fieldValue'] } }

type Rule = EqualsRule | NotEqualsRule | LessThanRule | LessThanOrEqualToRule | GreaterThanRule | GreaterThanOrEqualToRule | AndRule | OrRule | NotRule;

type BasicRule = EqualsRule | NotEqualsRule | LessThanRule | LessThanOrEqualToRule | GreaterThanRule | GreaterThanOrEqualToRule;


type Config = {
	title: string;
	fields: Field[];
}

const Form = (config: Config) => {

	const keys = ['==', '!=', '<', '<=', '>', '>=', 'and', 'or', 'not'];

	type FieldInternal = {
		readonly type: FieldBase['type'];
		readonly el: HTMLDivElement;
		readonly name: string;
		readonly visible: boolean;
		readonly required: boolean;
		readonly disabled: boolean;
		value: unknown;
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
		let input: HTMLInputElement | HTMLSelectElement | HTMLFieldSetElement;
		let getValue: () => unknown;
		let setValue: (val: any) => any;
		let setRequired: (bool: boolean) => void;

		if (f.type === 'textbox') {
			input = document.createElement('input') as HTMLInputElement;
			input.id = id;
			input.name = f.name;
			input.type = 'text';
			input.value = f.value ?? '';
			input.placeholder = f.placeholder ?? '';
			if (typeof f.maxLength === 'number') input.maxLength = f.maxLength;
			if (typeof f.minLength === 'number') input.minLength = f.minLength;
			div.replaceChildren(label, input);
			getValue = () => (input as HTMLInputElement).value.trim();
			setValue = (val: string) => (input as HTMLInputElement).value = val?.trim() || '';
			setRequired = (bool) => (input as HTMLInputElement).required = !!bool;
		}
		else if (f.type === 'checkbox') {
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
			getValue = () => !!(input as HTMLInputElement).checked;
			setValue = (val) => (input as HTMLInputElement).checked = !!val;
			setRequired = (bool) => (input as HTMLInputElement).required = !!bool;
		}
		else if (f.type === 'integer' || f.type === 'decimal') {
			input = document.createElement('input') as HTMLInputElement;
			input.id = id;
			input.name = f.name;
			input.type = 'number';
			input.placeholder = f.placeholder ?? '';
			if (typeof f.max === 'number') {
				input.max = String(Math.floor(f.max));
				input.maxLength = input.max.length;
			}
			if (typeof f.min === 'number') {
				input.min = String(Math.floor(f.min));
				if (f.min > 0) input.minLength = input.min.length;
			}
			// Keydown and input handlers to fix int and dec

			setRequired = (bool) => (input as HTMLInputElement).required = !!bool;
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
			// Enforce min/max here?
			const checkboxes = f.options.map(o => {
				const checkbox = document.createElement('input');
				const label = document.createElement('label');
				label.replaceChildren(checkbox, o.text);
				checkbox.type = 'checkbox';
				checkbox.name = f.name;
				checkbox.value = o.value;
				checkbox.checked = selectedValues.has(o.value);
				input.append(label);
				return checkbox;
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
				radio.checked = o.value === f.value;
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

		let _visible = true;
		let _disabled = false;
		let _required = false;

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

		let eventToListenFor = 'change';
		if (f.type === 'textbox' || f.type === 'integer' || f.type === 'decimal') {
			eventToListenFor = 'input';
		}
		input.addEventListener(eventToListenFor, () => {
			fireRecursiveDependencyUpdate(f.name);
		});

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
			set value(val: any) {
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
					//div.style.height = '';
				}
				else {
					div.style.display = 'none';
					//div.style.height = '0px';
				}
				requiredSpan.style.display = _required ? '' : 'none';
				setRequired(_required);
				input.disabled = _disabled || !_visible;
			}
		}

		FIELDS[f.name] = internals;

		return internals;
	};

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
	 * Figures out what a property should be based on form values.
	 * Returns default if not defined
	 */
	const evaluateProperty = (propertyVal: Rule[] | boolean | undefined, defaultValue: boolean): boolean => {
		if (typeof propertyVal === 'boolean') return propertyVal;
		if (Array.isArray(propertyVal)) return propertyVal.every(rule => evaluateRule(rule));
		return defaultValue;
	};

	/** 
		Interprets a side of a rule so we can compare the two sides
	*/
	const readRuleSide = (side: any) => {
		if (isVarRef(side)) {
			return FIELDS[side.var].value;
		}
		// Is already some kind of value so we return that.
		return side;
	}


	/** Makes a rule comparison: field value against a set value. 
	 * A little repetitive, but it's easier to understand doing the operations one by one like this compared to a lookup
	 * Also needs some type checking, maybe, or else you can do weird things like 'a' < 'aa' etc? */
	const evaluateRule = (rule: Rule): boolean => {
		if ('==' in rule) {
			const [left, right] = rule['=='];
			// Comparison will not work for arrays
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
		if (type === 'textbox' || type === 'select' || type === 'radiogroup') return '';
		if (type === 'integer' || type === 'decimal') return 0;
		if (type === 'checkboxgroup') return [];
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
	const valueObject = Object.create(null);
	for (const f of config.fields) {
		const fieldInternal = buildField(f);
		// Several layers of getter/setters here, probably one can be removed
		Object.defineProperty(valueObject, f.name, {
			get() {
				return fieldInternal.value;
			},
			set(value: any) {
				fieldInternal.value = value;
			},
			enumerable: true,
		});
		form.append(fieldInternal.el);
	}

	form.append(buttonRow);

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

	// Update everything once after creating form
	for (const fieldInternal of Object.values(FIELDS)) {
		fieldInternal.updateState();
	}

	const states: Record<string, typeof valueObject> = {};

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
		saveState(name: string) {
			const clone = structuredClone(valueObject);
			states[name] = clone;
			return clone;
		},
		loadState(name: string) {
			const value = states[name];
			if (!value) return;
			for (const key in value) {
				FIELDS[key].value = value[key];
			}
			return structuredClone(value);
		}
	};
};

