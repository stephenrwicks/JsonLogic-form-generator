const demo = Form({
    title: 'Basic Enrollment Form',
    fields: [
        {
            type: 'textbox',
            name: 'fullName',
            label: 'Full Name',
            value: '',
            required: true,
        },

        {
            type: 'checkbox',
            name: 'newsletter',
            label: 'Subscribe to newsletter',
            value: false,
        },

        {
            type: 'select',
            name: 'department',
            label: 'Department',
            value: '',
            options: [
                { text: 'Engineering', value: 'eng' },
                { text: 'Design', value: 'design' },
                { text: 'Operations', value: 'ops' },
            ],
            required: true,
        },

        {
            type: 'radiogroup',
            name: 'accessLevel',
            label: 'Access Level',
            value: 'standard',
            options: [
                { text: 'Standard', value: 'standard' },
                { text: 'Admin', value: 'admin' },
            ],
            required: true,
        },

        {
            type: 'checkboxgroup',
            name: 'tools',
            label: 'Preferred Tools',
            value: [],
            options: [
                { text: 'Git', value: 'git' },
                { text: 'Docker', value: 'docker' },
                { text: 'Node.js', value: 'node' },
            ],
            max: 2,
        },

        {
            type: 'checkboxgroup',
            name: 'primarySkills',
            label: 'Primary Skills',
            value: [],
            options: [
                { text: 'JavaScript', value: 'js' },
                { text: 'TypeScript', value: 'ts' },
                { text: 'CSS', value: 'css' },
            ],
        },

        {
            type: 'checkboxgroup',
            name: 'secondarySkills',
            label: 'Secondary Skills',
            value: ['ts'],
            disabled: true,
            options: [
                { text: 'JavaScript', value: 'js' },
                { text: 'TypeScript', value: 'ts' },
                { text: 'CSS', value: 'css' },
            ],
        },

        {
            type: 'textarea',
            name: 'skillMatchNote',
            label: 'Why are both skill selections identical?',
            value: '',
            visible: [
                {
                    and: [
                        {
                            '==': [
                                { var: 'primarySkills' },
                                { var: 'secondarySkills' },
                            ],
                        },
                        {
                            '!=': [
                                { var: 'primarySkills' },
                                [],
                            ],
                        },
                    ],
                },
            ],
        },

        {
            type: 'integer',
            name: 'yearsExperience',
            label: 'Years of Experience',
            value: 2,
            min: 0,
            max: 20,
        },

        {
            type: 'decimal',
            name: 'hoursPerWeek',
            label: 'Hours Available Per Week',
            value: 0,
        },

        {
            type: 'textarea',
            name: 'adminReason',
            label: 'Why admin access?',
            value: '',
            minLength: 25,
            visible: [
                { '==': [{ var: 'accessLevel' }, 'admin'] },
            ],
            required: [
                { '==': [{ var: 'accessLevel' }, 'admin'] },
            ],
        },
    ],
});

document.body.replaceChildren(demo.el);