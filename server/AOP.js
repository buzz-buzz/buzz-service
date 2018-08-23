export default class AOP {
    static setBefore() {
        /* eslint-disable */
        Function.prototype.before = function (func) {
            const self = this
            return function () {
                if (func.apply(this, arguments) === false) {
                    return false;
                }

                return self.apply(this, arguments)
            }
        };

        Function.prototype.beforeAsync = function (asyncFunc) {
            const self = this
            return async function () {
                if (await asyncFunc.apply(this, arguments) === false) {
                    return false
                }

                return await self.apply(this, arguments)
            }
        }
        /* eslint-enable */
    }

    static setAfter() {
        /* eslint-disable */
        Function.prototype.afterAsync = function (asyncFunc) {
            const self = this;
            return async function () {
                let result = await self.apply(this, arguments)

                if (result === false) {
                    return false;
                }

                await asyncFunc.apply(self, [result, ...arguments]);
                return result;
            }
        }
        /* eslint-enable */
    }
}