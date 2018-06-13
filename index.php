<!DOCTYPE html>
<html>
<head>
	<title>Приложение Учет рабочего времени</title>
	<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
	<link href="css/style.css?ver=1" type="text/css" rel="stylesheet" />
</head>
<body>

<div id="app">
    <div class="filter-block">
        <div class="filter-block-time time">
            <div class="time__period">
                <div class="time__period-text">
                    Период:
                </div>
                <div class="time__period-inputs">
                    <div class="time__period-item">
                        <label for="date-from">От</label>
                        <input type="date" id="date-from" v-model="dateStartString">
                    </div>
                    <div class="time__period-item">
                        <label for="date-to">До</label>
                        <input type="date" id="date-to"  v-model="dateEndString">
                    </div>
                </div>
            </div>
            <div class="time__month">

            </div>
            <div class="time__week">

            </div>
        </div>
        <div class="filter-block-user">
            <div class="user-button" v-on:click="getTime">
                Выбрать сотрудников
            </div>
            <div class="user-button" v-if="(users.length && dateStartString != '' && dateEndString != '')" v-on:click="getTasks">
                Сформировать
            </div>
        </div>
    </div>
    <div class="time-list">
        <div class="user-time-list" v-for="item in result">
            <div class="user-info">
                <div class="user-avatar">
                    <img v-bind:src="item.photo" class="user-img">
                </div>
                <div class="user-name">
                    <a v-bind:href="'https://nir-vanna.bitrix24.ru/company/personal/user/' + item.id + '/'">
                        {{item.name}}
                    </a>
                </div>
            </div>
            <table class="list" v-if="(item.taskCount && item.TASK_PERIOD_SECONDS)">
                <thead>
                <tr>
                    <th>ID задачи</th>
                    <th>Дата</th>
                    <th>Название</th>
                    <th>Время за период</th>
                    <th>Время общее</th>
                </tr>
                </thead>
                <tbody class="table-body">
                <tr v-for="(task, index) in item.tasks">
                    <td><a v-bind:href="'https://nir-vanna.bitrix24.ru/company/personal/user/' + item.id + '/tasks/task/view/' + index + '/'">{{index}}</a></td>
                    <td>{{formatDate(task.CREATED_DATE)}}</td>
                    <td class="left-align">{{task.TITLE}}</td>
                    <td>{{secondsToHours(task.PERIOD_SECONDS)}}</td>
                    <td>{{secondsToHours(task.ALL_SECONDS)}}</td>
                </tr>
                <tr>
                    <td colspan="3" class="bold right-align">Итого</td>
                    <td class="bold">{{secondsToHours(item.TASK_PERIOD_SECONDS)}}</td>
                    <td class="bold">{{secondsToHours(item.TASK_SECONDS)}}</td>
                </tr>
                </tbody>
            </table>
            <div class="no-items" v-else>
                Не найдено задач с затреченным временем за этот период
            </div>
        </div>
    </div>
    <div class="loader" v-if="isLoading">
        <div class="overlay"></div>
        <div class="container">
            <div class="dash uno"></div>
            <div class="dash dos"></div>
            <div class="dash tres"></div>
            <div class="dash cuatro"></div>
        </div>
    </div>
</div>

<script type="text/javascript" src="js/bxapi.js"></script>
<script type="text/javascript" src="js/restCall.js?ver=1"></script>
<script type="text/javascript" src="js/vuex.js"></script>
<script type="text/javascript" src="js/vue.js"></script>
<script type="text/javascript" src="js/application.js?ver=1.4"></script>
</body>
</html>



	
	
	
	