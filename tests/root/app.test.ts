import * as chai from "chai";
import { expect } from 'chai';
import chaiHttp = require('chai-http');
import app from "../../src/app"

chai.use(chaiHttp);
chai.should();



describe('UPLOAD', () => {
   describe('POST', () => {
      it('Should return an error because of an empty body', () => {
          chai.request(app._app)
              .post('/upload')
              .end((err,res) => {
                  expect(res.status).to.equal(400);
              });
      });
   });
});
