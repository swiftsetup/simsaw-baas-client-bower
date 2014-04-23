define(['angular'], function (angular) {
    'use strict';

    var content = angular.module('simsaw-baas-content', ['simsaw-baas']);

    function wysihtml5ParserRules() {
        return {
            "classes": {
                "wysiwyg-clear-both": 1,
                "wysiwyg-clear-left": 1,
                "wysiwyg-clear-right": 1,
                "wysiwyg-color-aqua": 1,
                "wysiwyg-color-black": 1,
                "wysiwyg-color-blue": 1,
                "wysiwyg-color-fuchsia": 1,
                "wysiwyg-color-gray": 1,
                "wysiwyg-color-green": 1,
                "wysiwyg-color-lime": 1,
                "wysiwyg-color-maroon": 1,
                "wysiwyg-color-navy": 1,
                "wysiwyg-color-olive": 1,
                "wysiwyg-color-purple": 1,
                "wysiwyg-color-red": 1,
                "wysiwyg-color-silver": 1,
                "wysiwyg-color-teal": 1,
                "wysiwyg-color-white": 1,
                "wysiwyg-color-yellow": 1,
                "wysiwyg-float-left": 1,
                "wysiwyg-float-right": 1,
                "wysiwyg-font-size-large": 1,
                "wysiwyg-font-size-larger": 1,
                "wysiwyg-font-size-medium": 1,
                "wysiwyg-font-size-small": 1,
                "wysiwyg-font-size-smaller": 1,
                "wysiwyg-font-size-x-large": 1,
                "wysiwyg-font-size-x-small": 1,
                "wysiwyg-font-size-xx-large": 1,
                "wysiwyg-font-size-xx-small": 1,
                "wysiwyg-text-align-center": 1,
                "wysiwyg-text-align-justify": 1,
                "wysiwyg-text-align-left": 1,
                "wysiwyg-text-align-right": 1
            },
            tags: {
                "b":  {},
                "i":  {},
                "br": {},
                "ol": {},
                "ul": {},
                "li": {},
                "h1": {},
                "h2": {},
                "h3": {},
                "h4": {},
                "h5": {},
                "h6": {},
                "blockquote": {},
                "p": 1,
                "span": 1,
                "div": 1,
                "code": 1,
                "pre": 1,
                "img": {
                    "check_attributes": {
                        "width": "numbers",
                        "alt": "alt",
                        "src": "url",
                        "height": "numbers"
                    }
                },
                "a":  {
                    check_attributes: {
                        'href': "allow", // important to avoid XSS
                        'target': 'alt',
                        'rel': 'alt',
                        'ng-click': 'allow'
                    }
                }
            }
        }
    }

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
                    scope: {
                    },
                    link: function (scope, elem, attrs, containerController) {
                        var name = attrs.simsawBaasContentBox,
                            location = $location.path(),
                            editHtml;

                        scope.isInputText = Boolean(attrs.txt);

                        // show loading...
                        elem.html("<p>Loading...</p>");

                        // load content
                        //Removed: {location : location } Footer Problem By MS
                        BaasData.findOne('content', {name: name}, function (err, data) {
                            var sampleContent = "<p>-- Empty, please edit --</p>";
                            scope.model = data || {name: name, location: location, content: sampleContent};
                            elem.html(data.content || sampleContent);
                        });

                        // create edit box to edit html
                        function showInEditMode(e) {
                            require(['jquery', 'wysihtml', 'wysihtml_parser_rules'], function ($, wysihtml5, customParserRules) {
                                editHtml = elem.html();
                                var editElem, editBox;
                                if (scope.isInputText) {
                                    editElem = angular.element("<form class='form baas-content-here'>" +
                                        "<div class='form-group'>" +
                                        "<input type='text' class='form-control inputfield' />" +
                                        "</div>" +
                                        "<div class='form-group'>" +
                                        "<input type='button' value='Save' class='btn btn-default' data-ng-click='save()'/>&nbsp;" +
                                        "<input type='button' value='Cancel' class='btn btn-default' data-ng-click='cancel()'/>" +
                                        "</div>" +
                                        "</form>");
                                    editBox = editElem.find('input')[0];
                                    $(editBox).val(editHtml);
                                    $(editBox).blur(function() {
                                        scope.model.content = $(editBox).val();
                                    });
                                } else {
                                    editElem = angular.element("<form class='form baas-content-here' style='z-index: 100; float: left'>" +
                                        "<div class='form-group'>" +
                                        "<textarea class='form-control' rows='15'></textarea>" +
                                        "</div>" +
                                        "<div class='clearfix'></div>" +
                                        "<div class='form-group clearfix'>" +
                                        "<input type='button' value='Save' class='btn btn-default' data-ng-click='save()'/>&nbsp;" +
                                        "<input type='button' value='Cancel' class='btn btn-default' data-ng-click='cancel()'/>" +
                                        "</div>" +
                                        "</form>");
                                    editBox = editElem.find('textarea');
                                    editBox.html(editHtml);
                                }

                                elem.html('');
                                elem.append($compile(editElem)(scope));

                                removeEditable();

                                if (!scope.isInputText) {
                                    var rules = wysihtml5ParserRules(),
                                        i;
                                    if (customParserRules) {
                                        if (customParserRules.classes) {
                                            for (i in customParserRules.classes) {
                                                rules.classes[i] = customParserRules.classes[i];
                                            }
                                        }
                                    }

                                    $(editBox).wysihtml5({
                                        //stylesheets: ['/css/final.css'],
                                        events: {
                                            "blur": function () {
                                                scope.$apply(function () {
                                                    scope.model.content = $(editBox).siblings("iframe").contents().find("body").html();
                                                });
                                            }
                                        },
                                        parserRules: rules,
                                        emphasis: true, //Italics, bold, etc. Default true
                                        lists: true, //(Un)ordered lists, e.g. Bullets, Numbers. Default true
                                        html: true, //Button which allows you to edit the generated HTML. Default false
                                        link: true, //Button to insert a link. Default true
                                        color: false, //Button to change color of font
                                        image: false, //Button to insert an image. Default true,
                                        "font-styles": false //Font styling, e.g. h1, h2, etc. Default true
                                    });
                                } else {
                                    $(editBox).blur(function () {
                                        scope.model.content = $(editBox).val();
                                    });
                                }
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

                            console.log('*** ', scope.model);

                            var saved = function () {
                                elem.html(scope.model.content);
                                editHtml = null;
                                setTimeout(setEditable, 200);
                            };

                            if (scope.model._id) {
                                BaasData.updateUnique(
                                    'content',
                                    {name: scope.model.name},
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