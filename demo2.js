"use strict";
const demo = Form({
    title: 'Regional Library Consortium Enrollment',
    fields: [
        {
            type: 'select',
            name: 'membershipType',
            label: 'Membership Type',
            value: '',
            options: [
                { text: 'Resident', value: 'resident' },
                { text: 'Non-Resident', value: 'nonresident' },
                { text: 'Institutional', value: 'institutional' },
            ],
            placeholder: 'Choose membership type',
            required: true,
        },
        {
            type: 'select',
            name: 'libraryBranch',
            label: 'Primary Branch',
            value: '',
            options: [
                { text: 'Downtown', value: 'downtown' },
                { text: 'West End', value: 'west' },
                { text: 'University Branch', value: 'university' },
            ],
            required: true,
        },
        {
            type: 'textbox',
            name: 'residentName',
            label: 'Full Name',
            value: '',
            visible: [
                { '==': [{ var: 'membershipType' }, 'resident'] },
            ],
            required: [
                { '==': [{ var: 'membershipType' }, 'resident'] },
            ],
        },
        {
            type: 'checkbox',
            name: 'residentSenior',
            label: 'Senior Discount Eligible',
            value: false,
            visible: [
                { '==': [{ var: 'membershipType' }, 'resident'] },
            ],
        },
        {
            type: 'checkbox',
            name: 'residentWantsPrograms',
            label: 'Enroll in community programs',
            value: false,
            visible: [
                {
                    and: [
                        { '==': [{ var: 'membershipType' }, 'resident'] },
                        { '!=': [{ var: 'residentName' }, ''] },
                    ],
                },
            ],
        },
        {
            type: 'select',
            name: 'programTrack',
            label: 'Program Track',
            value: '',
            options: [
                { text: 'Technology', value: 'tech' },
                { text: 'Genealogy', value: 'genealogy' },
                { text: 'Language Exchange', value: 'language' },
            ],
            visible: [
                { '==': [{ var: 'residentWantsPrograms' }, true] },
            ],
            required: [
                { '==': [{ var: 'residentWantsPrograms' }, true] },
            ],
        },
        {
            type: 'checkbox',
            name: 'techNeedsLaptop',
            label: 'Request laptop loan',
            value: false,
            visible: [
                {
                    and: [
                        { '==': [{ var: 'programTrack' }, 'tech'] },
                        { '==': [{ var: 'libraryBranch' }, 'downtown'] },
                    ],
                },
            ],
        },
        {
            type: 'select',
            name: 'techLaptopDuration',
            label: 'Laptop loan duration',
            value: '',
            options: [
                { text: '1 week', value: '1w' },
                { text: '2 weeks', value: '2w' },
                { text: '1 month', value: '1m' },
            ],
            visible: [
                { '==': [{ var: 'techNeedsLaptop' }, true] },
            ],
            required: [
                { '==': [{ var: 'techNeedsLaptop' }, true] },
            ],
        },
        {
            type: 'checkbox',
            name: 'techNeedsSoftware',
            label: 'Preinstall development software',
            value: false,
            visible: [
                {
                    and: [
                        { '==': [{ var: 'techNeedsLaptop' }, true] },
                        { '!=': [{ var: 'techLaptopDuration' }, ''] },
                    ],
                },
            ],
        },
        {
            type: 'select',
            name: 'softwareChoice',
            label: 'Software Package',
            value: '',
            options: [
                { text: 'VS Code', value: 'vscode' },
                { text: 'Python Suite', value: 'python' },
                { text: 'CAD Tools', value: 'cad' },
            ],
            visible: [
                { '==': [{ var: 'techNeedsSoftware' }, true] },
            ],
            required: [
                { '==': [{ var: 'techNeedsSoftware' }, true] },
            ],
        },
        {
            type: 'textbox',
            name: 'cadReason',
            label: 'Why do you need CAD tools?',
            value: '',
            visible: [
                {
                    and: [
                        { '==': [{ var: 'softwareChoice' }, 'cad'] },
                        { '==': [{ var: 'techNeedsSoftware' }, true] },
                    ],
                },
            ],
            required: [
                { '==': [{ var: 'softwareChoice' }, 'cad'] },
            ],
        },
        {
            type: 'checkbox',
            name: 'genealogyArchiveAccess',
            label: 'Request archive room access',
            value: false,
            visible: [
                { '==': [{ var: 'programTrack' }, 'genealogy'] },
            ],
        },
        {
            type: 'select',
            name: 'archiveMaterialType',
            label: 'Archive material type',
            value: '',
            options: [
                { text: 'Microfilm', value: 'microfilm' },
                { text: 'Original Records', value: 'records' },
                { text: 'Restricted Collection', value: 'restricted' },
            ],
            visible: [
                { '==': [{ var: 'genealogyArchiveAccess' }, true] },
            ],
            required: [
                { '==': [{ var: 'genealogyArchiveAccess' }, true] },
            ],
        },
        {
            type: 'checkbox',
            name: 'restrictedApproval',
            label: 'Supervisor pre-approved access',
            value: false,
            visible: [
                { '==': [{ var: 'archiveMaterialType' }, 'restricted'] },
            ],
            required: [
                { '==': [{ var: 'archiveMaterialType' }, 'restricted'] },
            ],
        },
        {
            type: 'textbox',
            name: 'approvalCode',
            label: 'Approval code',
            value: '',
            visible: [
                {
                    and: [
                        { '==': [{ var: 'archiveMaterialType' }, 'restricted'] },
                        { '==': [{ var: 'restrictedApproval' }, true] },
                    ],
                },
            ],
            required: [
                {
                    and: [
                        { '==': [{ var: 'archiveMaterialType' }, 'restricted'] },
                        { '==': [{ var: 'restrictedApproval' }, true] },
                    ],
                },
            ],
        },
        {
            type: 'select',
            name: 'languageChoice',
            label: 'Language',
            value: '',
            options: [
                { text: 'Spanish', value: 'spanish' },
                { text: 'Japanese', value: 'japanese' },
                { text: 'French', value: 'french' },
            ],
            visible: [
                { '==': [{ var: 'programTrack' }, 'language'] },
            ],
            required: [
                { '==': [{ var: 'programTrack' }, 'language'] },
            ],
        },
        {
            type: 'checkbox',
            name: 'needsConversationPartner',
            label: 'Request conversation partner',
            value: false,
            visible: [
                { '!=': [{ var: 'languageChoice' }, ''] },
            ],
        },
        {
            type: 'select',
            name: 'conversationLevel',
            label: 'Conversation level',
            value: '',
            options: [
                { text: 'Beginner', value: 'beginner' },
                { text: 'Intermediate', value: 'intermediate' },
                { text: 'Advanced', value: 'advanced' },
            ],
            visible: [
                { '==': [{ var: 'needsConversationPartner' }, true] },
            ],
            required: [
                { '==': [{ var: 'needsConversationPartner' }, true] },
            ],
        },
        {
            type: 'checkbox',
            name: 'advancedNeedsCertification',
            label: 'Need speaking certification',
            value: false,
            visible: [
                { '==': [{ var: 'conversationLevel' }, 'advanced'] },
            ],
        },
        {
            type: 'textbox',
            name: 'certificationReason',
            label: 'Certification purpose',
            value: '',
            visible: [
                { '==': [{ var: 'advancedNeedsCertification' }, true] },
            ],
            required: [
                { '==': [{ var: 'advancedNeedsCertification' }, true] },
            ],
        },
        {
            type: 'textbox',
            name: 'institutionName',
            label: 'Institution Name',
            value: '',
            visible: [
                { '==': [{ var: 'membershipType' }, 'institutional'] },
            ],
            required: [
                { '==': [{ var: 'membershipType' }, 'institutional'] },
            ],
        },
        {
            type: 'select',
            name: 'institutionSize',
            label: 'Institution Size',
            value: '',
            options: [
                { text: 'Small', value: 'small' },
                { text: 'Medium', value: 'medium' },
                { text: 'Large', value: 'large' },
            ],
            visible: [
                { '==': [{ var: 'membershipType' }, 'institutional'] },
            ],
            required: [
                { '==': [{ var: 'membershipType' }, 'institutional'] },
            ],
        },
        {
            type: 'checkbox',
            name: 'institutionNeedsBulkCards',
            label: 'Request bulk library cards',
            value: false,
            visible: [
                {
                    and: [
                        { '==': [{ var: 'membershipType' }, 'institutional'] },
                        { '!=': [{ var: 'institutionSize' }, ''] },
                    ],
                },
            ],
        },
        {
            type: 'textbox',
            name: 'bulkCardCount',
            label: 'Number of cards requested',
            value: '',
            visible: [
                { '==': [{ var: 'institutionNeedsBulkCards' }, true] },
            ],
            required: [
                { '==': [{ var: 'institutionNeedsBulkCards' }, true] },
            ],
        },
        {
            type: 'checkbox',
            name: 'bulkRequiresApproval',
            label: 'Administrative approval attached',
            value: false,
            visible: [
                {
                    and: [
                        { '==': [{ var: 'institutionNeedsBulkCards' }, true] },
                        { '!=': [{ var: 'bulkCardCount' }, ''] },
                    ],
                },
            ],
        },
        {
            type: 'textbox',
            name: 'specialNotes',
            label: 'Special Notes',
            value: '',
            visible: [
                {
                    or: [
                        { '==': [{ var: 'residentSenior' }, true] },
                        { '==': [{ var: 'restrictedApproval' }, true] },
                        { '==': [{ var: 'bulkRequiresApproval' }, true] },
                    ],
                },
            ],
            required: [
                {
                    or: [
                        { '==': [{ var: 'restrictedApproval' }, true] },
                        { '==': [{ var: 'bulkRequiresApproval' }, true] },
                    ],
                },
            ],
        },
    ],
});
document.body.replaceChildren(demo.el);
