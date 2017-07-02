module App {
    declare var document;
    declare var angular;
    declare var firebase;
    export class MainCtrl {
        user: any;
        isAdmin: boolean;
        isSaving: boolean;
        isEditmode: boolean;
        constructor(private $state, private bookingsService, private userService: UserService) {
            this.user = firebase.auth().currentUser;
            this.isAdmin = userService.isAdmin;
            this.isSaving = false;
            this.isEditmode = false;
            if (!this.user) {
                $state.go("login");
            }

		}
		changePassword() {
			this.userService.changePassword();
		}
        switchUser = (user) => {
            this.userService.setCurrentUser(user.$id);
            this.bookingsService.setBookings(user.company);

        };
        deleteBooking = (booking) => {
            this.bookingsService.deleteBooking(booking);
        };
        addBooking = () => {
            var booking = {
                date: '2017-01-01',
                hours: '00:00',
                title: 'Titel',
                maxBookings: 30
            };
            this.bookingsService.addBooking(booking);
        };
        saveChanges = () => {
            this.isEditmode = false;
            this.isSaving = true;
            this.bookingsService.saveBookings();
            this.isSaving = false;

        };
        openMoreInfoModal = () => {

        };
        signOut = () => {
            firebase.auth().signOut().then((result) => {
                this.$state.go("login");
                this.bookingsService.reset();
                this.userService.reset();
            }).catch((error) => {
                console.log(error);
            });
        };
    }
    export class LoginCtrl {
        user: any;
        email = "";
        password = "";
        isLoading: boolean;
        constructor(private bookingsService, private $state) {
            this.user = firebase.auth().currentUser;
            if (this.user) {
                $state.go("bookings");
            }
        }

        login = () => {
            this.isLoading = true;
            this.email.replace(/ /g, "");
            var email = this.email + "@frontlinebookings.se";
            var password = this.password;
            firebase.auth()
                .signInWithEmailAndPassword(email, password)
                .then((result) => {
                    this.$state.go("bookings");
                    this.isLoading = false;
                })
                .catch((error) => {

                    console.log(error);
                    var errorCode = error.code;
                    var errorMessage = error.message;
                    // ...
                    this.isLoading = false;
                });
        };


    } export class BookingsService {
        allBookings: any = [];
        bookings: any = [];
        bookingsUsers = {};
        selectedCompany = "";
        constructor(private $firebaseObject, private $firebaseArray, private userService) {

        }
        reset = () => {
            this.bookingsUsers = {};
            this.bookings = [];

        };
        deleteBooking = (booking) => {
            this.bookings.$remove(booking);
        };
        saveBookings = () => {
            this.bookings.forEach((x) => {
                var arrayRef = this.bookings.$ref();
                var objRef = arrayRef.child(x.$id);
                this.$firebaseObject(objRef).$loaded((data) => {
                    data.hours = x.hours;
                    data.date = x.date;
                    data.maxBookings = x.maxBookings;
                    data.title = x.title;
                    data.users = x.users ? x.users : null;
                    data.$save();
                });
            });
        };
        setBookings = (companyName) => {
            this.selectedCompany = companyName;
            var ref = firebase.database().ref("Bookings/" + companyName + "/bookings");
            ref.once('value').then((data) => {
                var s = data.val();
            });
            this.bookings = this.$firebaseArray(ref);
        };
        getUsersForBooking = (bookingId) => {
            if (!this.bookingsUsers[bookingId]) {
                var companyName = this.userService.user.company;
                var ref = firebase.database().ref("Bookings/" + companyName + "/bookings/" + bookingId + "/users");
                var users = this.$firebaseArray(ref);
                this.bookingsUsers[bookingId] = users;
                return users;
            }
            return this.bookingsUsers[bookingId];
        };
        removeUserFromBooking = (bookingId, user) => {
            this.bookingsUsers[bookingId].$remove(user).then(data => {
                console.log("user removed");
            });
        };
        addBooking = (booking) => {
            this.bookings.$add(booking);
        };
        addUserToBooking = (bookingId, user) => {
            return this.bookingsUsers[bookingId].$add(user);
        };
        getAllBookings = () => {
            this.allBookings = this.$firebaseArray(firebase.database().ref("Bookings"));
            this.allBookings.$loaded((data) => {
                this.selectedCompany = data[0].$id;
                this.setBookings(this.selectedCompany);
            });
            return this.allBookings;
        };

    } export class UserService {
        user: any = {};
		allUsers: any = [];
		isAdmin = false;
        constructor(private $firebaseArray, private $firebaseObject, private $firebaseAuth) {

        }
        reset = () => {
            this.user = {};
        };
		changePassword() {
			//var authObj = this.$firebaseAuth();
			//authObj.$updatePassword("xxxxxxxx").then(function () {
			//	console.log("Password changed successfully!");
			//}).catch(function (error) {
			//	console.error("Error: ", error);
			//});
		}
        setCurrentUser = (uid) => {
            var ref = firebase.database().ref("Users/" + uid);
            this.user = this.$firebaseObject(ref);
            return this.user;
        };
        getAllUsers = () => {
            this.allUsers = this.$firebaseArray(firebase.database().ref("Users"));
            return this.allUsers;
        };

    }
    export class BookingCtrl {
        booking: any;
        tempUserBooking: any;
        menuItems = ["", "Kycklingpasta 75:-", "Laxpasta 75:-", "Caesarsallad 85:-", "Smoothie 55:-"];

        constructor(private bookingsService, private userService) {

        }
        initialize = (booking) => {
            this.booking = booking;
        };
        getUsersForBooking = () => {
            return this.bookingsService.getUsersForBooking(this.booking.$id);
        };
        removeUserFromBooking = (user) => {
            var result = confirm(`Ta bort ${user.name}?`);
            if (result) {
                this.bookingsService.removeUserFromBooking(this.booking.$id, user);
            }
        };
        makeBooking = () => {
            this.tempUserBooking.uid = this.userService.user.$id;
            this.bookingsService.addUserToBooking(this.booking.$id, this.tempUserBooking).then((result) => {
                this.tempUserBooking = null;
                this.closeBookingModal();
            },
                (error) => {
                    console.log(error);
                });
        };

        openBookingModal = () => {
            document.getElementById('booking-' + this.booking.$id).style.display = 'block';
        };
        closeBookingModal = () => {
            document.getElementById('booking-' + this.booking.$id).style.display = 'none';
        };
        openBookedUsersModal = () => {
            document.getElementById('userlist-' + this.booking.$id).style.display = 'block';
        };
        closeBookedUsersModal = () => {
            document.getElementById('userlist-' + this.booking.$id).style.display = 'none';
        };
    }
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
                    userService.isAdmin = uid === 'XZ7z0DX95AgCQ6XiX0pGNO82xWL2'; //shortcuts shortcuts
                    userData.$loaded((data) => {
                        if (userService.isAdmin) {
                            userService.getAllUsers().$loaded((data) => {
                                userService.setCurrentUser(data[0].$id);
                                bookingsService.setBookings(data[0].company);

                            });
                        } else {
                            bookingsService.setBookings(data.company);

                        }
                        $state.go("bookings");
                    });

                } else {
                    // User is signed out.
                    // ...
                }
                // ...
            });

    });

    app.controller("bookingCtrl", BookingCtrl);
    app.controller("mainCtrl", MainCtrl);
    app.controller("loginCtrl", LoginCtrl);
    app.service("userService", UserService);
    app.service("bookingsService", BookingsService);

}