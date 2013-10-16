define(['angular'], function (angular) {
    'use strict';

    var content = angular.module('simsaw-baas-content', ['simsaw-baas']);

    content.directive('simsawBaasContentBox',
        [
            '$location',
            '$rootScope',
            '$compile',
            'simsaw-baas-data',
            'simsaw-baas-auth',
            function ($location, $rootScope, $compile, BaasData, Auth) {
                return {
                    restrict: 'AC',
                    scope: {},
                    link: function (scope, elem, attrs) {

                        var name = attrs.simsawBaasContentBox,
                            location = $location.path(),
                            editHtml;

                        // show loading...
                        elem.html("<p>Loading...</p>");

                        // load content
                        BaasData.findOne('content', {name: name, location: location}, function (err, data) {
                            var sampleContent = "<p>-- Empty, please edit --</p>";
                            scope.model = data || {name: name, location: location, content: sampleContent};
                            elem.html(data.content || sampleContent);
                        });

                        // create edit box to edit html
                        function showInEditMode(e) {
                            require(['jquery', 'wysihtml'], function ($, wysihtml5) {
                                editHtml = elem.html();
                                var editElem = angular.element("<form class='form'>" +
                                    "<div class='form-group'>" +
                                    "<textarea class='form-control' rows='25'></textarea>" +
                                    "</div>" +
                                    "<div class='form-group'>" +
                                    "<input type='button' value='Save' class='btn btn-default' data-ng-click='save()'/>&nbsp;" +
                                    "<input type='button' value='Cancel' class='btn btn-default' data-ng-click='cancel()'/>" +
                                    "</div>" +
                                    "</form>");

                                var editBox = editElem.find('textarea');

                                editBox.html(editHtml);

                                elem.html('');
                                elem.append($compile(editElem)(scope));

                                removeEditable();

//                                scope.$watch('model.content', function (val) {
//                                    console.log('** checking: ' + val);
//                                    $(editBox).siblings("iframe").contents().find("body").html(val);
//                                });

                                $(editBox).wysihtml5({
                                    events: {
                                        "blur": function () {
                                            scope.$apply(function () {
                                                scope.model.content = $(editBox).siblings("iframe").contents().find("body").html();
                                            });
                                        }
                                    }
                                });
                            });
                        }

                        function setEditable() {
                            elem.attr("style", "cursor: pointer");
                            elem.bind('click', showInEditMode);
                        }

                        function removeEditable() {
                            elem.attr("style", "cursor: auto");
                            elem.unbind('click');
                        }

                        function cancelEditing(noMoreEditing) {
                            elem.html(editHtml);
                            editHtml = null;

                            if (!noMoreEditing) {
                                setTimeout(setEditable, 200);
                            }
                        }

                        // scope methods
                        scope.save = function () {
                            var saved = function () {
                                elem.html(scope.model.content);
                                editHtml = null;
                                setTimeout(setEditable, 200);
                            };

                            if (scope.model._id) {
                                BaasData.updateUnique(
                                    'content',
                                    {name: scope.model.name, location: scope.model.location},
                                    scope.model._id,
                                    scope.model,
                                    function (err, data) {
                                        if (data) {
                                            saved();
                                        }
                                    }
                                );
                            } else {
                                BaasData.save('content', scope.model, function (err, data) {
                                    if (data) {
                                        scope.model._id = data._id;
                                        saved();
                                    }
                                });
                            }
                        };

                        scope.cancel = function () {
                            cancelEditing();
                        };

                        // on directive load
                        Auth.getUserInfo().then(function (user) {
                            if (user && user.role === 2) {
                                setEditable();
                            } else {
                                removeEditable();
                            }
                        });

                        // handle  user logout.
                        $rootScope.$on('auth-logout', function (e) {
                            cancelEditing(true);
                            removeEditable();
                        });
                    }
                };
            }
        ]);
});