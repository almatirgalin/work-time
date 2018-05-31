const store = new Vuex.Store({
    state: {
        data: {},
		period: {}
    },
    mutations: {
        setData(state, data){
            /*for (let id in users) {
                Vue.set( state.users, id, users[id])
            }*/
            state.data = data;
        }
    }
});

const app = new Vue({
    el: '#app',
    // provide the store using the "store" option.
    // this will inject the store instance to all child components.
    store,
    computed: {
        data () {
            return this.$store.state.data
        }
    },
    mounted: function () {
        this.getOnLoad();
    },
    updated: function () {
        BX24.fitWindow();
    },
    data: {
        result: {},
        users: [],
        usersId: [],
        tasks: [],
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
                console.log(dateStart);
                console.log(dateEnd);
                console.log(usersId);
                if (dateStart !== undefined && dateEnd !== undefined && usersId !== undefined) {
                    this.dateStartString = dateStart;
                    this.dateEndString = dateEnd;
                    this.users = JSON.parse(usersId);
                    for (let user of this.users) {
                        this.usersId.push(user.id);
                    }
                    this.isLoading = true;
                    this.getTasks();
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
                this.isLoading = true;
                this.users = [];
                this.usersId = [];
                for (let user of res) {
                    this.usersId.push(user.id);
                    this.users.push(user);
                }
                BX24.userOption.set('users', JSON.stringify(this.users));
                this.getTasks();
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
                    this.tasks = data.tasks.data;
                    if (this.tasks.length) {
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
                            'RESPONSIBLE_ID': this.usersId
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

    	    this.tasks.forEach((elem) => {
                this.timeBatchCommands.push(this.getTimeCommand(elem.ID, elem.RESPONSIBLE_ID));
            });

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
            endDate.setDate(endDate.getDate() + 1)

            console.log(startDate);
            console.log(endDate);
    	    for (let time of this.taskTimes) {
    	        let periodSeconds = 0;
    	        let DATE_START = new Date(time.DATE_START);
    	        let DATE_STOP = new Date(time.DATE_STOP);

    	        if (DATE_START > startDate && DATE_STOP < endDate) {//Внутри периода
    	            //console.log('in period');
                    periodSeconds = time.SECONDS;
                } else if (DATE_START < startDate && (DATE_STOP < endDate && DATE_STOP > startDate)) {//Дата начала раньше даты начала периода
                    //console.log('before period');
                    let timeDiff = Math.abs(startDate.getTime() - DATE_START.getTime());
                    let diffSeconds = Math.ceil(timeDiff / 1000);
                    periodSeconds = time.SECONDS - diffSeconds;
                } else if ((DATE_START > startDate && DATE_START < endDate) && DATE_STOP > endDate) {//Дата конца больше даты конца периода
                    //console.log('after period');
                    let timeDiff = Math.abs(DATE_STOP.getTime() - endDate.getTime());
                    let diffSeconds = Math.ceil(timeDiff / 1000);
                    periodSeconds = time.SECONDS - diffSeconds;
                }

                time.PERIOD_SECONDS = periodSeconds;
            }

            let secondsInTask = {};
            let periodSecondsInTaskAll = {};
            let periodSecondsInTask = {};

            for (let time of this.taskTimes) {
                periodSecondsInTaskAll[time.TASK_ID] = 0;
                secondsInTask[time.TASK_ID] = 0;
            }

            for (let time of this.taskTimes) {
                periodSecondsInTaskAll[time.TASK_ID] += Number(time.PERIOD_SECONDS);
                secondsInTask[time.TASK_ID] += Number(time.SECONDS);
            }

            for (let a in periodSecondsInTaskAll) {
                if (periodSecondsInTaskAll.hasOwnProperty(a)) {
                    if (periodSecondsInTaskAll[a]) {
                        periodSecondsInTask[a] = periodSecondsInTaskAll[a];
                    }
                }
            }

            let tasks = [];

            for (let a in this.tasks) {
                if (this.tasks.hasOwnProperty(a)) {
                    let taskId = Number(this.tasks[a].ID);

                    if (taskId in periodSecondsInTask) {
                        //console.log('in task');
                        let task = this.tasks[a];
                        task['ALL_SECONDS'] = secondsInTask[taskId];
                        task['PERIOD_SECONDS'] = periodSecondsInTask[taskId];
                        tasks.push(task);
                    }
                }
            }

            this.tasks = tasks;

            for (let user of this.users) {
                Vue.set(this.result, user.id, user);
                Vue.set(this.result[user.id], 'tasks', {});
            }

            let tasksCount = 0;
            for (let task of this.tasks) {
                Vue.set(this.result[task.RESPONSIBLE_ID].tasks, task.ID, task);
                tasksCount++;
                Vue.set(this.result[task.RESPONSIBLE_ID], 'taskCount', tasksCount);
            }

            for (let i in this.result) {
                if (this.result.hasOwnProperty(i)) {
                    let user = this.result[i];
                    let allSecs = 0;
                    let periodSecs = 0;
                    for (let a in user.tasks) {
                        if (user.tasks.hasOwnProperty(a)) {
                            let task = user.tasks[a];
                            allSecs += task.ALL_SECONDS;
                            periodSecs += task.PERIOD_SECONDS;
                        }
                    }
                    user.TASK_SECONDS = allSecs;
                    user.TASK_PERIOD_SECONDS = periodSecs;
                }
            }

            /*for (let time of this.taskTimes) {
                Vue.set(this.result[time.USER_ID].tasks[time.TASK_ID]['times'], time.ID, time);
            }*/
            console.log('result');
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



