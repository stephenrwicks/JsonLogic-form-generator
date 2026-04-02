
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

// metarules
type AndRule = { and: Rule[] };
type OrRule = { or: Rule[] };
type NotRule = { not: Rule }; // { not: { '==': [{ var: 'fieldName' }, 'fieldValue'] } }

type Rule = EqualsRule | NotEqualsRule | LessThanRule | LessThanOrEqualToRule | GreaterThanRule | GreaterThanOrEqualToRule | AndRule | OrRule | NotRule;


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
		let input: HTMLInputElement | HTMLSelectElement;
		let getValue: () => unknown;
		let setValue: (val: any) => any;

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
			getValue = () => !!(input as HTMLInputElement).checked;
			setValue = (val) => (input as HTMLInputElement).checked = !!val;
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
			div.replaceChildren(label, input);
			getValue = () => input.value.trim();
			setValue = (val: string) => input.value = val?.trim() || '';
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
			setValue = (val: string) => input.value = validValues.has(val) ? val : '';
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
				}
				else {
					div.style.display = 'none';
				}
				requiredSpan.style.display = _required ? '' : 'none';
				input.required = _required;
				input.disabled = _disabled || !_visible;
			}
		}

		FIELDS[f.name] = internals;

		return internals;
	};


	// To implement contextual rules that compare against current day, etc., will need custom operators with context:
	// const context = {
	//   today: new Date(),
	//   // etc.
	// };
	// then compare against that

	/** Repetitive loop to return a set of strings. Can probably be simplified if I look up by key */
	const getFieldNamesToWatch = (field: Field): Set<string> => {
		const resultSet = new Set<string>();

		const addVarIfExists = (val: unknown) => {
			if (val && typeof val === 'object' && 'var' in val && typeof val.var === 'string') {
				resultSet.add(val.var);
			}
		};

		const collectVars = (rule: Rule) => {
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

		const collectAllVarNames = (rules: Rule[] | boolean | undefined) => {
			if (!Array.isArray(rules)) return;
			for (const r of rules) {
				collectVars(r);
			}
		};

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
		if (!!side && typeof side === 'object' && 'var' in side) {
			// Is a VarRef (a field name) so we look up the value of the input with that name
			return FIELDS[side.var].value;
		}
		// Is already some kind of value so we return that.
		return side;
	}


	/** Makes a rule comparison: field value against a set value. 
	 * A little repetitive, but it's easier to understand doing the operations one by one like this compared to a lookup
	 * Also needs some type checking, maybe, or else you can do weird things like 'a' < 'aa' etc? */
	const evaluateRule = (rule: Rule, thingToDo: 'evaluate' | 'getDependencies' = 'evaluate'): boolean => {
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
		if (type === 'textbox' || type === 'select') return '';
		if (type === 'integer') return 0;
	};

	// const getFormValues = () => {
	// 	// // Get this on every change => evaluate rules for every input by cycling through map => use internal setters to change status => update dom
	// 	const values: Record<string, unknown> = {};
	// 	for (const fieldInternal of Object.values(FIELDS)) {
	// 		values[fieldInternal.name] = fieldInternal.value;
	// 	}
	// 	return values;
	// };

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

