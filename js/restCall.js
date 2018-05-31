/**
 * Created by Almat Irgalin on 23.09.2017.
 */
;(function () {

    RestCall = function () {
        let app = this;
        app.commands = [];
        app.result = [];
        app.errors = [];
        app.onSuccess = '';
        app.onError = '';
    };

    RestCall.prototype.init = function () {
        BX24.init(function(){
            //console.log('Инициализация завершена!');
        });
    };

    RestCall.prototype.isEmpty = function (obj) {

        // null and undefined are "empty"
        if (obj == null) return true;

        if (obj.length > 0)    return false;
        if (obj.length === 0)  return true;

        if (typeof obj !== "object") return true;

        for (let key in obj) {
            if (hasOwnProperty.call(obj, key)) return false;
        }

        return true;
    };

    /**
     * Получаем значение total для запросов
     * @param arCommands
     * @param callback
     * @param callbackError
     */
    RestCall.prototype.batch = function (arCommands, callback, callbackError) {
        let app = this,
            errorsCount = 0;
        app.onSuccess = callback;
        app.onError = callbackError;
        let arComs = {};
        for (let a in arCommands) {
            if (arCommands.hasOwnProperty(a)) {
                arComs[a] = arCommands[a];
                app.result[a] = {};
            }
        }

        for (let i in arCommands) {
            if (arCommands.hasOwnProperty(i)) {
                if (arCommands[i].method === 'task.item.list') {
                    let filter = {
                        'REAL_STATUS': [1,2,3,4,5,6,7]
                    };

                    if (!app.isEmpty((arCommands[i].params.filter))) {
                        filter = arCommands[i].params.filter;
                    }

                    let order = {
                        'ID': 'ASC'
                    };

                    if (!app.isEmpty((arCommands[i].params.order))) {
                        order = arCommands[i].params.order;
                    }

                    let select = ['*'];

                    if (!app.isEmpty((arCommands[i].params.select))) {
                        select = arCommands[i].params.select;
                    }

                    let params = [
                        order,
                        filter,
                        {NAV_PARAMS: {nPageSize: '50', iNumPage: '1'}},
                        select
                    ];

                    arCommands[i] = {
                        method: 'task.item.list',
                        params: params
                    };
                }
            }

        }

        let batchCallback = function (res) {
            let allTotalLessFifty = true;

            for (let key in res) {
                if (res.hasOwnProperty(key)) {
                    if (res[key].error()) {
                        app.errors[key] = res[key].error();
                        errorsCount++;
                    }

                    if (res[key].total()) {
                        if (res[key].total() > 50) {
                            allTotalLessFifty = false;
                        }
                        app.result[key].data = [];
                        app.result[key].total = res[key].total();

                        if (res[key].data()) {
                            let data = res[key].data();
                            for (let a in data) {
                                if (data.hasOwnProperty(a)) {
                                    app.result[key].data.push(data[a]);
                                }
                            }
                        }
                        if (res[key].total() < 50) {
                            delete arCommands[key];
                        }
                    } else if (isNaN(res[key].total()) || res[key].total() === null) {
                        app.result[key].data = res[key].data();
                    } else {
                        app.result[key].total = 0;
                    }
                }
            }

            if (errorsCount > 0) {
                app.onError(app.errors);
            } else {
                if (allTotalLessFifty) {
                    app.onSuccess(app.result);
                } else {
                    if (arCommands.length > 0) {
                        setTimeout(BX24.callBatch(arCommands, batchCallback), 500);
                    } else {
                        app.buildCommandsArray(arComs);
                    }
                }
            }
        };

        BX24.callBatch(arCommands, batchCallback);
    };

    /**
     * Строим массив оптимизированных запросов
     * @param arCommands
     */
    RestCall.prototype.buildCommandsArray = function (arCommands) {
        let app = this;
        app.commands = [];
        for (let key in arCommands) {
            if (arCommands.hasOwnProperty(key)) {
                let item = arCommands[key];
                let itemTotal = app.result[key].total;
                let itemCount = Math.ceil(itemTotal / 50);

                if (itemTotal < 50) {
                    itemCount--;
                }

                for (let i = 1; i < itemCount; i++) {
                    (function (i) {
                        let command = {};
                        app.commands[key + '_' + i] = {};

                        if (item.method === 'task.item.list') {
                            let filter = {
                                'REAL_STATUS': [1,2,3,4,5,6,7]
                            };

                            if (!app.isEmpty((item.params.filter))) {
                                filter = item.params.filter;
                            }

                            let order = {
                                'ID': 'ASC'
                            };

                            if (!app.isEmpty((item.params.order))) {
                                order = item.params.order;
                            }

                            let select = ['*'];

                            if (!app.isEmpty((item.params.select))) {
                                select = item.params.select;
                            }

                            let params = [
                                order,
                                filter,
                                {NAV_PARAMS: {nPageSize: '50', iNumPage: i+1}},
                                select
                            ];

                            command[key + '_' + i] = {};
                            command[key + '_' + i].params = [];
                            command[key + '_' + i].method = item.method;
                            command[key + '_' + i].params = params;
                        } else {
                            command[key + '_' + i] = {};
                            command[key + '_' + i].method = item.method;
                            command[key + '_' + i].params = {};
                            command[key + '_' + i].params.order = item.params.order;
                            command[key + '_' + i].params.select = item.params.select;
                            command[key + '_' + i].params.start = i * 50;
                        }

                        if (item.params.hasOwnProperty('filter') && item.method !== 'task.item.list') {
                            command[key + '_' + i].params.filter = item.params.filter;
                        }
                        if (item.params.hasOwnProperty('entity')) {
                            command[key + '_' + i].params.entity = item.params.entity;
                        }

                        app.commands.push(command);
                    })(i);
                }

            }
        }

        app.batchPacks();
    };

    /**
     * Вызов пакетов запросов
     */
    RestCall.prototype.batchPacks = function () {
        let app = this;
        let commands = app.buildCommands();

        let batchCallback = function(res){
            for (let index in res) {
                if (res.hasOwnProperty(index)) {
                    let data = res[index].data();
                    let keys = index.split('_');
                    let key = keys[0];
                    for (let i in data) {
                        if (data.hasOwnProperty(i)) {
                            app.result[key]['data'].push(data[i]);
                        }
                    }
                }
            }
            if (app.commands.length > 0) {
                let commands = app.buildCommands();
                setTimeout(BX24.callBatch(commands, batchCallback), 500);
            } else {
                app.onSuccess(app.result);
                //console.log("all ok");
            }
        };

        BX24.callBatch(commands, batchCallback);
    };

    /**
     * Строим пакет запросов
     * @returns {{}}
     */
    RestCall.prototype.buildCommands = function () {
        let app = this;
        //console.log(app.commands);
        let commandsPack = app.commands.splice(0, 50);
        //console.dir(commandsPack);
        let commands = {};
        commandsPack.forEach(function (val) {
            for (let key in val) {
                if (val.hasOwnProperty(key)) {
                    commands[key] = val[key];
                }
            }
        });
        //console.log(commands);
        return commands;
    }
})();