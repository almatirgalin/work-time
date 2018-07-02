/*const store = new Vuex.Store({
    state: {
        data: {},
		period: {}
    },
    mutations: {
        setData(state, data){
            /!*for (let id in users) {
                Vue.set( state.users, id, users[id])
            }*!/
            state.data = data;
        }
    }
});*/

const app = new Vue({
    el: '#app',
    computed: {
        countResult () {
            let count = 0;
            for (let a in this.result) {
                count++;
            }
            return count;
        }
    },
    mounted: function () {
        this.getOnLoad();
    },
    updated: function () {
        let body = document.getElementById('app');
        BX24.resizeWindow(body.offsetWidth, +body.offsetHeight + 150);
    },
    data: {
        result: {},
        users: {},
        usersId: [],
        tasks: {},
        taskTimes: [],
        timeBatchCommands: [],
        dateStart: '',
        dateEnd: '',
        dateStartString: '',
        dateEndString: '',
        isLoading: false
    },
	methods: {
        getOnLoad: function () {
            setTimeout(() => {
                let dateStart = BX24.userOption.get('startDate');
                let dateEnd = BX24.userOption.get('dateEnd');
                let usersId = BX24.userOption.get('users');

                if (dateStart !== undefined && dateEnd !== undefined && usersId !== undefined) {
                    this.dateStartString = dateStart;
                    this.dateEndString = dateEnd;
                    this.users = JSON.parse(usersId);
                    for (let id in this.users) {
                        this.usersId.push(id);
                    }
                }
            }, 500);
        },
        getTime: function () {
            this.result = {};

            if ((this.dateStartString === '' || this.dateEndString ==='')) {
                alert('Пожалуйста, выберите период');
            } else {
                BX24.userOption.set('startDate', this.dateStartString);
                BX24.userOption.set('dateEnd', this.dateEndString);
                this.getUser();
            }
        },
        getUser: function () {
            BX24.selectUsers((res) => {
                if (res.length) {
                    this.isLoading = true;
                    this.users = {};
                    this.usersId = [];
                    for (let user of res) {
                        this.usersId.push(user.id);
                        this.users[user['id']] = user;
                    }
                    BX24.userOption.set('users', JSON.stringify(this.users));
                    this.getTasks();
                } else {
                    alert('Сотрудники не выбраны. Выберите, пожалуйста, сотрудников');
                }
            })
        },
        getTasks: function () {//Получить все задачи выбранных пользователей
            BX24.userOption.set('startDate', this.dateStartString);
            BX24.userOption.set('dateEnd', this.dateEndString);
            this.isLoading = true;
                let commands = [];

    	    if (this.usersId.length) {
                commands = this.getTaskCommands();
            }

            let call = new RestCall();

    	    call.batch( //Запрос
                commands,
                (data) => {
                    let tasks = data.tasks.data;
                    let tasksCreated = data.tasksCreated.data;
                    let tasksAuditor = data.tasksAuditor.data;

                    if (tasks != undefined && tasks.length) {
                        tasks.forEach((item) => {
                            this.tasks[item.ID] = item;
                        });

                        if (tasksCreated != undefined && tasksCreated.length) {
                            tasksCreated.forEach((item) => {
                                if (!this.tasks.hasOwnProperty(item.ID)) {
                                    this.tasks[item.ID] = item;
                                }
                            });
                        }

                        if (tasksAuditor != undefined && tasksAuditor.length) {
                            tasksAuditor.forEach((item) => {
                                if (!this.tasks.hasOwnProperty(item.ID)) {
                                    this.tasks[item.ID] = item;
                                }
                            });
                        }

                        this.buildCommandsArray();
                    }
                    //store.commit('setData', data);
                },
                (error) => {
                    console.log(error);
                }
            );

        },
        getTaskCommands: function() {
            return {
                'tasks': {
                    method: 'task.item.list',
                    params: {
                        order: {'CREATED_DATE': 'asc'},
                        filter: {
                            'RESPONSIBLE_ID': this.usersId,
                        },
                        params : [],
                        select: [
                            'TITLE',
                            'CREATED_DATE',
                            'DEADLINE',
                            'STATUS',
                            'CREATED_BY',
                            'RESPONSIBLE_ID'
                        ]
                    }
                },
                'tasksCreated': {
                    method: 'task.item.list',
                    params: {
                        order: {'CREATED_DATE': 'asc'},
                        filter: {
                            'CREATED_BY': this.usersId,
                        },
                        params : [],
                        select: [
                            'TITLE',
                            'CREATED_DATE',
                            'DEADLINE',
                            'STATUS',
                            'CREATED_BY',
                            'RESPONSIBLE_ID'
                        ]
                    }
                },
                'tasksAuditor': {
                    method: 'task.item.list',
                    params: {
                        order: {'CREATED_DATE': 'asc'},
                        filter: {
                            'AUDITOR': this.usersId,
                        },
                        params : [],
                        select: [
                            'TITLE',
                            'CREATED_DATE',
                            'DEADLINE',
                            'STATUS',
                            'CREATED_BY',
                            'RESPONSIBLE_ID'
                        ]
                    }
                },
            }
        },
        getTimeCommand: function(taskId, userId) {
            return {
                ['time_' + taskId]: {
                    method: 'task.elapseditem.getlist',
                    params: [
                        taskId,
                        {'ID': 'asc'},
                        {
                            'USER_ID': userId
                        }
                    ]
                },
            }
        },
        buildCommandsArray: function () {
            this.timeBatchCommands = [];

            for (let id in this.tasks) {
                if (this.tasks.hasOwnProperty(id)) {
                    if (~this.usersId.indexOf(this.tasks[id].RESPONSIBLE_ID)) {
                        this.timeBatchCommands.push(this.getTimeCommand(id, this.tasks[id].RESPONSIBLE_ID));
                    } else {
                        this.timeBatchCommands.push(this.getTimeCommand(id, this.tasks[id].CREATED_BY));
                    }
                }
            }

    	    this.batchPacks();
        },
        batchPacks: function () {
            this.taskTimes = [];
            let commands = this.buildCommandsPack();

            let batchCallback = (res) => {
                for (let index in res) {
                    if (res.hasOwnProperty(index)) {
                        let data = res[index].data();
                        let keys = index.split('_');
                        let key = keys[0];
                        for (let i in data) {
                            if (data.hasOwnProperty(i)) {
                                this.taskTimes.push(data[i]);
                            }
                        }
                    }
                }
                if (this.timeBatchCommands.length > 0) {
                    commands = this.buildCommandsPack();
                    setTimeout(BX24.callBatch(commands, batchCallback), 500);
                } else {
                    this.buildData();
                }
            };

            BX24.callBatch(commands, batchCallback);
        },
        buildData: function () {
            let startDate = new Date(this.dateStartString);
            startDate.setHours(0, 0, 0);
            let endDate = new Date(this.dateEndString);
            endDate.setHours(0, 0, 0);
            endDate.setDate(endDate.getDate() + 1);
            let workTimes = [];
            let dayWorkTimes = {};
            let secondsInTask = {};

            for (let time of this.taskTimes) {
                if (!secondsInTask.hasOwnProperty(time.TASK_ID)) {
                    secondsInTask[time.TASK_ID] = 0;
                }
                secondsInTask[time.TASK_ID] += Number(time.SECONDS);
            }

            this.taskTimes.forEach((time, i) => {
                let dateStart = new Date(time.CREATED_DATE);

                if (time.SOURCE == 3) {
                    if (!dayWorkTimes.hasOwnProperty(time.USER_ID)) {//Если время затречил сотрудник из списка выбранных
                        if (~this.usersId.indexOf(time.USER_ID)) {
                            dayWorkTimes[time.USER_ID] = {};
                            dayWorkTimes[time.USER_ID].userData = {};
                            dayWorkTimes[time.USER_ID].userDays = {};
                            dayWorkTimes[time.USER_ID].sortDays = [];
                            dayWorkTimes[time.USER_ID].allTime = 0;
                        }
                    }

                    if (~this.usersId.indexOf(time.USER_ID)) {
                        let user = dayWorkTimes[time.USER_ID].userDays;
                        dayWorkTimes[time.USER_ID].userData = this.users[time.USER_ID];

                        if (dateStart > startDate && dateStart < endDate) {//Внутри периода
                            let day = time.CREATED_DATE.substr(0, 10);
                            if (!~dayWorkTimes[time.USER_ID].sortDays.indexOf(day)) {
                                dayWorkTimes[time.USER_ID].sortDays.push(day);
                            }

                            if (!user.hasOwnProperty(day)) {
                                user[day] = {};
                                user[day].tasks = {};
                                user[day].tasksCount = 0;
                                user[day].periodTasksTime = 0;
                                //user[day].allTasksTime = 0;
                            }

                            let dayTimes = user[day].tasks;
                            if (!dayTimes.hasOwnProperty(time.TASK_ID)) {
                                dayTimes[time.TASK_ID] = {};
                                dayTimes[time.TASK_ID].periodTime = 0;
                                dayTimes[time.TASK_ID].allTime = 0;
                                dayTimes[time.TASK_ID].title = this.tasks[time.TASK_ID].TITLE;
                                dayTimes[time.TASK_ID].date = this.tasks[time.TASK_ID].CREATED_DATE;
                            }

                            dayWorkTimes[time.USER_ID].allTime += Number(time.SECONDS);
                            user[day].periodTasksTime += Number(time.SECONDS);
                            //user[day].allTasksTime += Number(secondsInTask[time.TASK_ID]);
                            dayTimes[time.TASK_ID].periodTime += Number(time.SECONDS);
                            dayTimes[time.TASK_ID].allTime = secondsInTask[time.TASK_ID];

                            time.PERIOD_SECONDS = time.SECONDS;
                        }
                    }
                }
            });

            this.result = dayWorkTimes;
            for (let userId in this.result) {
                if (this.result.hasOwnProperty(userId)) {
                    this.result[userId].sortDays.sort();
                    for (let dayId in this.result[userId].userDays) {
                        if (this.result[userId].userDays.hasOwnProperty(dayId)) {
                            let day = this.result[userId].userDays[dayId];
                            let taskCount = 0;
                            for (let i in day.tasks) {
                                if (day.tasks.hasOwnProperty(i)) {
                                    day.tasks[i].row = taskCount;
                                }
                                taskCount++;
                            }
                            this.result[userId].userDays[dayId].tasksCount = taskCount;
                        }
                    }
                }
            }
            console.log(this.result);
            this.isLoading = false;
        },
        buildCommandsPack: function () {
            let commandsPack = this.timeBatchCommands.splice(0, 50);
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
        },
        formatDate: function (dateString) {
            let year = dateString.substr(2, 2);
            let month = dateString.substr(5, 2);
            let day = dateString.substr(8, 2);
            return day + '.' + month + '.' + year;
        },
        secondsToHours: function (seconds) {
            let h = seconds/3600 ^ 0 ;
            let m = (seconds-h*3600)/60 ^ 0 ;
            let s = seconds-h*3600-m*60 ;
            return ((h<10?"0"+h:h)+":"+(m<10?"0"+m:m)+":"+(s<10?"0"+s:s)) ;
        }
	}
});



