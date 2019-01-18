const fs = require('fs-extra');
const path = require('path');
const child_process = require('child_process');
const { getSecHeadResult, getData, getResults } = require('./');

const securityheadersTestData = fs.readFileSync('./test/mock-data/headers.txt');
const mozillaTestData = fs.readFileSync('./test/mock-data/observatory.txt');


jest.mock('child_process', () => {
    return {
        spawn: jest.fn(() => ({
            on: jest.fn((process, callback) => {
                callback();
            }),
            stdout: { pipe: jest.fn() },
            stderr: { pipe: jest.fn() }
        }))
    }
});

describe('securityheaders', () => {

    beforeEach(() => {
        const today = new Date();

        const filePath = path.join(__dirname, '../../reports/securityheaders-results/securityheaders.com', today.toISOString());
        fs.ensureDirSync(filePath);

        fs.writeFileSync(path.join(filePath, 'headers.txt'), securityheadersTestData);
	fs.writeFileSync(path.join(filePath, 'observatory.txt'), mozillaTestData);


    })

    afterEach(() => {
        fs.removeSync(path.join(__dirname, '../../../reports/securityheaders-results/securityheaders.com'));
    });

    describe('getSecHeadResult', () => {

        it('finds and resolves the securityheaders results for the given url', async () => {

            const result = await getSecHeadResult('securityheaders.com');
            
            expect(result).toEqual(getScore(mozillaTestData,getResults(securityheadersTestData,{}));

        });

        it('rejects when no file can be found', async () => {
            fs.removeSync(path.join(__dirname, '../../reports/securityheaders-results/securityheaders.com'));
            await expect(getSecHeadResult('securityheaders.com')).rejects.toEqual('Failed to get securityheaders file for securityheaders.com');
        });

    });


    describe('getData', () => {

        it('calls the shell script to get the data from securityheaders docker image and resolves with the securityheaders file flattened when succesfully finished', async () => {

            const data = await getData('securityheaders.com');
            expect(child_process.spawn).toBeCalledWith('bash', [path.join(__dirname, './securityheaders.sh'), 'securityheaders.com', "/usr/src/garie-securityheaders/reports/securityheaders-results/securityheaders.com"]);

            expect(data).toEqual(getScore(mozillaTestData,getResults(securityheadersTestData,{}));


        });

        it('rejects when child process fails', async () => {

            child_process.spawn.mockImplementation(() => {
                throw new Error('Failed');
            })

            await expect(getData('securityheaders.com')).rejects.toEqual('Failed to get data for securityheaders.com');

        });


    });

});

