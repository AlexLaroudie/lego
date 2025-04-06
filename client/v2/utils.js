// Invoking strict mode https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Strict_mode#invoking_strict_mode
'use strict';


/**
 * 
 * @param {Array} deals - list of deals
 * @returns {Array} list of lego set ids
 */
function getIdsFromDeals(deals) {
    return Array.from(new Set(
      deals.map(d => d.legoId).filter(id => typeof id === 'string' && id.trim() !== '')
    ));
  }
  
