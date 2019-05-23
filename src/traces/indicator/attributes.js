/**
* Copyright 2012-2019, Plotly, Inc.
* All rights reserved.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*/

'use strict';

// var plotAttrs = require('../../plots/attributes');
// var domainAttrs = require('../../plots/domain').attributes;

// var extendFlat = require('../../lib/extend').extendFlat;

module.exports = {
    values: {
        valType: 'data_array',
        editType: 'calc',
        description: [
            'Sets the number to be displayed.'
        ].join(' ')
    },

    mode: {
        valType: 'enumerated',
        editType: 'calc',
        values: ['gauge', 'bignumber'],
        dflt: 'bignumber'
    }
};
