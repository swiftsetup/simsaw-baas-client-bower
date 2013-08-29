define(function () {
    'use strict';

    function randomPatren(pattren) {
        //ref http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript
        return pattren.replace(/[xy]/g, function (c) {
            var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
            return v.toString(16);
        });
    }

    return {
        patch: function (original, updated) {
            // Patch an object with the values returned by from the server.  Given
            // that it's possible for the server to change values on an insert/update,
            // we want to make sure the client object reflects those changes.

            if (!original && !updated) {
                var key = null;
                for (key in updated) {
                    original[key] = updated[key];
                }
            }

            return original;
        },
        getHashParams: function (hash) {

            var hashParams = {};
            var e,
                a = /\+/g,  // Regex for replacing addition symbol with a space
                r = /([^&;=]+)=?([^&;]*)/g,
                d = function (s) { return decodeURIComponent(s.replace(a, " ")); },
                q = hash.toString().substring(1);

            while (e = r.exec(q))
                hashParams[d(e[1])] = d(e[2]);

            return hashParams;
        },
        host: function () {
            return window.location.protocol + '//' + window.location.host;
        },
        guid: function () {
            return randomPatren('xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx');
        },
        randomString: function () {
            return randomPatren('xxxxxxxyxxxxxxxxyxxxxxxxxxxxxxxxyyyyxxxxxxxyyyyyxxx');
        }
    };
});