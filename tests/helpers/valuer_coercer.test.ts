import { expect } from 'chai';
import { coerceLanguage, validateLanguage, validateCondition} from "../../src/helpers/value_coercer";

describe('coerceLanguage', () => {
    it('returns a default value when an unknown value is passed in',() => {
        expect(coerceLanguage('some unknown value')).to.equal('en');
    });
    it('Converts UC long word to code', () => {
        expect(coerceLanguage('ENGLISH')).to.equal('en');
    });
});

describe('validateLanguage', () => {
    it('returns a default value when an unknown value is passed in',() => {
        expect(validateLanguage('kr')).to.equal('en');
    });
    it( 'Leaves a short code unchanged', () => {
        expect(validateLanguage('kp')).to.equal('kp');
    });
    it( 'Lowercases a short code', () => {
        expect(validateLanguage('EN')).to.equal('en');
    });
});

describe( 'validateCondition', () => {
   it('Correctly parses a known good value', () => {
       expect(validateCondition('NEAR MINT')).to.equal('NM');
   });
   it('Defaults to NM when garbage is passed in', () => {
       expect(validateCondition('GARBAGE')).to.equal('NM');
   });
   it( 'can parse out a code', () => {
       expect(validateCondition('b9')).to.equal('B9');
   });
});