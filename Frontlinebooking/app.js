var App;
(function (App) {
    var MainCtrl = (function () {
        function MainCtrl($state, bookingsService, userService) {
            var _this = this;
            this.$state = $state;
            this.bookingsService = bookingsService;
            this.userService = userService;
            this.switchUser = function (user) {
                _this.userService.setCurrentUser(user.$id);
                _this.bookingsService.setBookings(user.company);
            };
            this.deleteBooking = function (booking) {
                _this.bookingsService.deleteBooking(booking);
            };
            this.addBooking = function () {
                var booking = {
                    date: '2017-01-01',
                    hours: '00:00',
                    title: 'Titel',
                    maxBookings: 30
                };
                _this.bookingsService.addBooking(booking);
            };
            this.saveChanges = function () {
                _this.isEditmode = false;
                _this.isSaving = true;
                _this.bookingsService.saveBookings();
                _this.isSaving = false;
            };
            this.openMoreInfoModal = function () {
            };
            this.signOut = function () {
                firebase.auth().signOut().then(function (result) {
                    _this.$state.go("login");
                    _this.bookingsService.reset();
                    _this.userService.reset();
                }).catch(function (error) {
                    console.log(error);
                });
            };
            this.user = firebase.auth().currentUser;
            this.isAdmin = userService.isAdmin;
            this.isSaving = false;
            this.isEditmode = false;
            if (!this.user) {
                $state.go("login");
            }
        }
        MainCtrl.prototype.changePassword = function () {
            this.userService.changePassword();
        };
        return MainCtrl;
    }());
    App.MainCtrl = MainCtrl;
    var LoginCtrl = (function () {
        function LoginCtrl(bookingsService, $state) {
            var _this = this;
            this.bookingsService = bookingsService;
            this.$state = $state;
            this.email = "";
            this.password = "";
            this.login = function () {
                _this.isLoading = true;
                _this.email.replace(/ /g, "");
                var email = _this.email + "@frontlinebookings.se";
                var password = _this.password;
                firebase.auth()
                    .signInWithEmailAndPassword(email, password)
                    .then(function (result) {
                    _this.$state.go("bookings");
                    _this.isLoading = false;
                })
                    .catch(function (error) {
                    console.log(error);
                    var errorCode = error.code;
                    var errorMessage = error.message;
                    // ...
                    _this.isLoading = false;
                });
            };
            this.user = firebase.auth().currentUser;
            if (this.user) {
                $state.go("bookings");
            }
        }
        return LoginCtrl;
    }());
    App.LoginCtrl = LoginCtrl;
    var BookingsService = (function () {
        function BookingsService($firebaseObject, $firebaseArray, userService) {
            var _this = this;
            this.$firebaseObject = $firebaseObject;
            this.$firebaseArray = $firebaseArray;
            this.userService = userService;
            this.allBookings = [];
            this.bookings = [];
            this.bookingsUsers = {};
            this.selectedCompany = "";
            this.reset = function () {
                _this.bookingsUsers = {};
                _this.bookings = [];
            };
            this.deleteBooking = function (booking) {
                _this.bookings.$remove(booking);
            };
            this.saveBookings = function () {
                _this.bookings.forEach(function (x) {
                    var arrayRef = _this.bookings.$ref();
                    var objRef = arrayRef.child(x.$id);
                    _this.$firebaseObject(objRef).$loaded(function (data) {
                        data.hours = x.hours;
                        data.date = x.date;
                        data.maxBookings = x.maxBookings;
                        data.title = x.title;
                        data.users = x.users ? x.users : null;
                        data.$save();
                    });
                });
            };
            this.setBookings = function (companyName) {
                _this.selectedCompany = companyName;
                var ref = firebase.database().ref("Bookings/" + companyName + "/bookings");
                ref.once('value').then(function (data) {
                    var s = data.val();
                });
                _this.bookings = _this.$firebaseArray(ref);
            };
            this.getUsersForBooking = function (bookingId) {
                if (!_this.bookingsUsers[bookingId]) {
                    var companyName = _this.userService.user.company;
                    var ref = firebase.database().ref("Bookings/" + companyName + "/bookings/" + bookingId + "/users");
                    var users = _this.$firebaseArray(ref);
                    _this.bookingsUsers[bookingId] = users;
                    return users;
                }
                return _this.bookingsUsers[bookingId];
            };
            this.removeUserFromBooking = function (bookingId, user) {
                _this.bookingsUsers[bookingId].$remove(user).then(function (data) {
                    console.log("user removed");
                });
            };
            this.addBooking = function (booking) {
                _this.bookings.$add(booking);
            };
            this.addUserToBooking = function (bookingId, user) {
                return _this.bookingsUsers[bookingId].$add(user);
            };
            this.getAllBookings = function () {
                _this.allBookings = _this.$firebaseArray(firebase.database().ref("Bookings"));
                _this.allBookings.$loaded(function (data) {
                    _this.selectedCompany = data[0].$id;
                    _this.setBookings(_this.selectedCompany);
                });
                return _this.allBookings;
            };
        }
        return BookingsService;
    }());
    App.BookingsService = BookingsService;
    var UserService = (function () {
        function UserService($firebaseArray, $firebaseObject, $firebaseAuth) {
            var _this = this;
            this.$firebaseArray = $firebaseArray;
            this.$firebaseObject = $firebaseObject;
            this.$firebaseAuth = $firebaseAuth;
            this.user = {};
            this.allUsers = [];
            this.isAdmin = false;
            this.reset = function () {
                _this.user = {};
            };
            this.setCurrentUser = function (uid) {
                var ref = firebase.database().ref("Users/" + uid);
                _this.user = _this.$firebaseObject(ref);
                return _this.user;
            };
            this.getAllUsers = function () {
                _this.allUsers = _this.$firebaseArray(firebase.database().ref("Users"));
                return _this.allUsers;
            };
        }
        UserService.prototype.changePassword = function () {
            //var authObj = this.$firebaseAuth();
            //authObj.$updatePassword("xxxxxxxx").then(function () {
            //	console.log("Password changed successfully!");
            //}).catch(function (error) {
            //	console.error("Error: ", error);
            //});
        };
        return UserService;
    }());
    App.UserService = UserService;
    var BookingCtrl = (function () {
        function BookingCtrl(bookingsService, userService) {
            var _this = this;
            this.bookingsService = bookingsService;
            this.userService = userService;
            this.menuItems = ["", "Kycklingpasta 75:-", "Laxpasta 75:-", "Caesarsallad 85:-", "Smoothie 55:-"];
            this.initialize = function (booking) {
                _this.booking = booking;
            };
            this.getUsersForBooking = function () {
                return _this.bookingsService.getUsersForBooking(_this.booking.$id);
            };
            this.removeUserFromBooking = function (user) {
                var result = confirm("Ta bort " + user.name + "?");
                if (result) {
                    _this.bookingsService.removeUserFromBooking(_this.booking.$id, user);
                }
            };
            this.makeBooking = function () {
                _this.tempUserBooking.uid = _this.userService.user.$id;
                _this.bookingsService.addUserToBooking(_this.booking.$id, _this.tempUserBooking).then(function (result) {
                    _this.tempUserBooking = null;
                    _this.closeBookingModal();
                }, function (error) {
                    console.log(error);
                });
            };
            this.openBookingModal = function () {
                document.getElementById('booking-' + _this.booking.$id).style.display = 'block';
            };
            this.closeBookingModal = function () {
                document.getElementById('booking-' + _this.booking.$id).style.display = 'none';
            };
            this.openBookedUsersModal = function () {
                document.getElementById('userlist-' + _this.booking.$id).style.display = 'block';
            };
            this.closeBookedUsersModal = function () {
                document.getElementById('userlist-' + _this.booking.$id).style.display = 'none';
            };
        }
        return BookingCtrl;
    }());
    App.BookingCtrl = BookingCtrl;
    var app = angular.module("app", ["ui.router", "firebase"]);
    app.config(function ($stateProvider, $urlRouterProvider) {
        $urlRouterProvider.otherwise('/');
        var loginState = {
            name: 'login',
            url: '/login',
            templateUrl: 'login.html'
        };
        var mainState = {
            name: 'bookings',
            url: '/',
            templateUrl: 'bookings.html'
        };
        var adminState = {
            name: 'admin',
            url: '/admin',
            templateUrl: 'admin.html'
        };
        $stateProvider.state(loginState);
        $stateProvider.state(mainState);
        $stateProvider.state(adminState);
        var config = {
            apiKey: "AIzaSyDxjbAbxibCjUmD044Ru_ctwyzBEEc_-Pk",
            authDomain: "frontlinebooking-2c056.firebaseapp.com",
            databaseURL: "https://frontlinebooking-2c056.firebaseio.com",
            storageBucket: "frontlinebooking-2c056.appspot.com",
            messagingSenderId: "973705531402"
        };
        firebase.initializeApp(config);
    });
    app.run(function ($state, userService, bookingsService) {
        firebase.auth()
            .onAuthStateChanged(function (user) {
            if (user) {
                var uid = user.uid;
                var userData = userService.setCurrentUser(uid);
                userService.isAdmin = uid === 'XZ7z0DX95AgCQ6XiX0pGNO82xWL2';
                userData.$loaded(function (data) {
                    if (userService.isAdmin) {
                        userService.getAllUsers().$loaded(function (data) {
                            userService.setCurrentUser(data[0].$id);
                            bookingsService.setBookings(data[0].company);
                        });
                    }
                    else {
                        bookingsService.setBookings(data.company);
                    }
                    $state.go("bookings");
                });
            }
            else {
            }
            // ...
        });
    });
    app.controller("bookingCtrl", BookingCtrl);
    app.controller("mainCtrl", MainCtrl);
    app.controller("loginCtrl", LoginCtrl);
    app.service("userService", UserService);
    app.service("bookingsService", BookingsService);
})(App || (App = {}));
//# sourceMappingURL=app.js.map