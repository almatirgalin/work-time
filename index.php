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
            <div class="user-button" v-if="(usersId.length && dateStartString != '' && dateEndString != '')" v-on:click="getTasks">
                Сформировать
            </div>
        </div>
    </div>
    <div class="time-list">
        <div class="user-time-list" v-for="(user, userId) in result">
            <div class="user-info">
                <div class="user-avatar">
                    <img v-bind:src="user.userData.photo" class="user-img">
                </div>
                <div class="user-name">
                    <a v-bind:href="'https://nir-vanna.bitrix24.ru/company/personal/user/' + userId + '/'">
                        {{user.userData.name}}
                    </a>
                </div>
            </div>
            <div class="head-table">
                <div class="head-1">Дата</div>
                <div class="head-table-dates">
                    <div class="head head-2">ID задачи</div>
                    <div class="head head-3">Дата создания</div>
                    <div class="head head-4">Название</div>
                    <div class="head head-5">Время за период</div>
                    <div class="head head-6">Время общее</div>
                </div>
            </div>
            <div class="user-days" v-for="(dayId) in user.sortDays">
                <div class="user-day">
                    {{formatDate(dayId)}}
                </div>
                <table class="list">
                    <tbody class="table-body">
                    <tr v-for="(task, index) in user.userDays[dayId].tasks" class="user-tasks">
                        <td><a v-bind:href="'https://nir-vanna.bitrix24.ru/company/personal/user/' + userId + '/tasks/task/view/' + index + '/'">{{index}}</a></td>
                        <td>{{formatDate(task.date)}}</td>
                        <td class="left-align">{{task.title}}</td>
                        <td>{{secondsToHours(task.periodTime)}}</td>
                        <td>{{secondsToHours(task.allTime)}}</td>
                    </tr>
                    <tr class="all-time">
                        <td colspan="3" class="bold right-align">Итого</td>
                        <td class="bold">{{secondsToHours(user.userDays[dayId].periodTasksTime)}}</td>
                        <td class="bold"></td>
                    </tr>
                    </tbody>
                </table>
            </div>
            <!--<div class="no-items" v-else>
                Не найдено задач с затреченным временем за этот период
            </div>-->
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
<script type="text/javascript" src="js/vue.min.js"></script>
<script type="text/javascript" src="js/application.js?ver=1.7"></script>
</body>
</html>



	
	
	
	