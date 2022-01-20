// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

// Add any needed widget imports here (or from controls)
// import {} from '@jupyter-widgets/base';

import { createTestModel } from './utils';

import { KlamptModel } from '..';

describe('Klampt', () => {
  describe('KlamptModel', () => {
    it('should be createable', () => {
      const model = createTestModel(KlamptModel);
      expect(model).toBeInstanceOf(KlamptModel);
    });

    it('should be createable with a value', () => {
      const model = createTestModel(KlamptModel);
      expect(model).toBeInstanceOf(KlamptModel);
    });
  });
});
