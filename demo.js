"use strict";
const form = Form({
    title: 'Library form',
    fields: [
        {
            type: 'select',
            name: 'audienceType',
            label: 'Who is this account for?',
            value: '',
            options: [
                { text: 'Adult', value: 'adult' },
                { text: 'Teen', value: 'teen' },
                { text: 'Child', value: 'child' },
            ],
            placeholder: 'Select an option',
        },
        {
            type: 'textbox',
            name: 'adultFullName',
            label: 'Full Name',
            value: '',
            placeholder: 'Enter your full name',
            visible: [
                { '==': [{ var: 'audienceType' }, 'adult'] },
            ],
            required: [
                { '==': [{ var: 'audienceType' }, 'adult'] },
            ],
        },
        {
            type: 'checkbox',
            name: 'adultJoinBookClub',
            label: 'Join Mystery Book Club?',
            value: false,
            visible: [
                { '==': [{ var: 'audienceType' }, 'adult'] },
            ],
        },
        {
            type: 'select',
            name: 'adultFavoriteMysteryAuthor',
            label: 'Favorite Mystery Author',
            value: '',
            options: [
                { text: 'Agatha Christie', value: 'agatha' },
                { text: 'Arthur Conan Doyle', value: 'doyle' },
                { text: 'Gillian Flynn', value: 'flynn' },
            ],
            placeholder: 'Select an author',
            visible: [
                { '==': [{ var: 'adultJoinBookClub' }, true] },
            ],
            required: [
                { '==': [{ var: 'adultJoinBookClub' }, true] },
            ],
        },
        {
            type: 'textbox',
            name: 'teenFullName',
            label: 'Full Name',
            value: '',
            placeholder: 'Enter your full name',
            visible: [
                { '==': [{ var: 'audienceType' }, 'teen'] },
            ],
            required: [
                { '==': [{ var: 'audienceType' }, 'teen'] },
            ],
        },
        {
            type: 'select',
            name: 'teenGameNightChoice',
            label: 'Which game would you like at Game Night?',
            value: '',
            options: [
                { text: 'Chess', value: 'chess' },
                { text: 'Monopoly', value: 'monopoly' },
                { text: 'Trivia', value: 'trivia' },
            ],
            placeholder: 'Select a game',
            visible: [
                { '==': [{ var: 'audienceType' }, 'teen'] },
            ],
            required: [
                { '==': [{ var: 'audienceType' }, 'teen'] },
            ],
        },
        {
            type: 'checkbox',
            name: 'teenChessExperience',
            label: 'I know how to play chess',
            value: false,
            visible: [
                {
                    and: [
                        { '==': [{ var: 'audienceType' }, 'teen'] },
                        { '==': [{ var: 'teenGameNightChoice' }, 'chess'] },
                    ],
                },
            ],
        },
        {
            type: 'checkbox',
            name: 'teenMonopolyStrategy',
            label: 'I have a Monopoly strategy',
            value: false,
            visible: [
                {
                    and: [
                        { '==': [{ var: 'audienceType' }, 'teen'] },
                        { '==': [{ var: 'teenGameNightChoice' }, 'monopoly'] },
                    ],
                },
            ],
        },
        {
            type: 'textbox',
            name: 'teenTriviaTeamName',
            label: 'Trivia Team Name',
            value: '',
            placeholder: 'Enter your team name',
            visible: [
                {
                    and: [
                        { '==': [{ var: 'audienceType' }, 'teen'] },
                        { '==': [{ var: 'teenGameNightChoice' }, 'trivia'] },
                    ],
                },
            ],
            required: [
                {
                    and: [
                        { '==': [{ var: 'audienceType' }, 'teen'] },
                        { '==': [{ var: 'teenGameNightChoice' }, 'trivia'] },
                    ],
                },
            ],
        },
        {
            type: 'textbox',
            name: 'childFullName',
            label: 'Child Full Name',
            value: '',
            placeholder: 'Enter child\'s full name',
            visible: [
                { '==': [{ var: 'audienceType' }, 'child'] },
            ],
            required: [
                { '==': [{ var: 'audienceType' }, 'child'] },
            ],
        },
        {
            type: 'textbox',
            name: 'guardianName',
            label: 'Parent/Guardian Name',
            value: '',
            placeholder: 'Enter guardian name',
            visible: [
                { '==': [{ var: 'audienceType' }, 'child'] },
            ],
            required: [
                {
                    and: [
                        { '==': [{ var: 'audienceType' }, 'child'] },
                        { '!=': [{ var: 'childFullName' }, ''] },
                    ],
                },
            ],
        },
        {
            type: 'checkbox',
            name: 'childRoomAccess',
            label: 'Access to Children\'s Room?',
            value: false,
            visible: [
                { '==': [{ var: 'audienceType' }, 'child'] },
            ],
        },
    ],
});
document.body.replaceChildren(form.el);
