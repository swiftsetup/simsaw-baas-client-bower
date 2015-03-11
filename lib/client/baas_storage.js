// ref :http://codeartists.com/post/36892733572/how-to-directly-upload-files-to-amazon-s3-from-your
/**
 * Sample Use:
 *  <div data-file-upload data-accept="application/pdf|application/xls" data-multiple="true" data-acl='private' data-on-complete="uploadCompleted(files)">
 *  </div>
 *
 * CSS
 .file-upload-drop-zone {
        height: 100px;
        width: 200px;
        border: 3px dotted #ffffff;
    }
 .file-upload-dragover {
    }
 .file-upload-list {
    }
 .file-upload-input {
    }
 .file-upload-limit {
    }
 */
define(['angular', 'simsaw/utils'], function (angular, utils) {
    'use strict';

    var _alert, baasStorage, fileUploadTemplate, simpleTemplate, fileUploadDDTemplate, fileUploadDDTransTemplate;

    baasStorage = angular.module('simsaw-baas-storage', ['simsaw-baas', 'simsaw-baas-auth']);

    fileUploadTemplate = '<span class="btn btn-default fileinput-button"> ' +
            '<i class="glyphicon glyphicon-plus"></i>' +
            '<span>Upload</span>' +
            '<span><input type="file" name="files[]" multiple="" accept="{{accept}}" capture="camera"/></span>' +
        '</span>' +
        '<br>' +
        '<small class="file-upload-limit">' +
            'File max size must be {{ limit }}' +
        '</small>' +
        '<p data-ng-repeat="upload in uploads | filter: {uploading: true}">' +
            '<progressbar id="uploadprogress" class="progress-striped active" min="0" max="100" value="upload.progress" type="success">{{upload.progress}}</progressbar>' +
            '&nbsp;<small>{{ upload.fileName }}</small>' +
        '</p>';

    simpleTemplate = '<label>' +
            '<div ng-transclude></div>' +
            '<input multiple="" type="file" accept="{{accept}}" capture="camera" style="display: none"/>' +
            '<p data-ng-repeat="upload in uploads | filter: {uploading: true}" style="display: block">' +
                '{{upload.progress}}%' +
            '</p>' +
        '</label>';

    fileUploadDDTemplate =
        '<div class="file-upload-drop-zone"></div><br>' +
        '<input class="file-upload-input" multiple="" type="file" accept="{{accept}}" capture="camera"/>' +
        '<small class="file-upload-limit"> File max size must be {{ limit }}</small>' +
        '<p data-ng-repeat="upload in uploads | filter: {uploading: true}">' +
            '<progressbar class="progress-striped active" min="0" max="100" value="upload.progress" type="success">{{upload.progress}}</progressbar>' +
            '&nbsp;<small>{{ upload.fileName }}</small>' +
        '</p>';

    fileUploadDDTransTemplate = '<div ng-transclude>' + fileUploadDDTemplate + '</div>';



    function fileUpload(scope, elem, attrs, baasAuth, baasRequest, Alert) {
        initScope(scope, attrs);

        getMediaData(baasRequest, scope, function (data) {
            var fileInput;
            scope.limit = data.maxFileSize;

            if (testCompat().progress && testCompat().formData) {

                fileInput = elem.find('input');

                if (attrs.multiple && attrs.multiple === 'true') {
                    fileInput.attr('multiple', 'multiple');
                } else {
                    fileInput.removeAttr('multiple');
                }

                baasAuth.getUserInfo()
                    .then(function (user) {
                        bindFileChange(baasRequest, scope, user, fileInput, data, Alert);
                    });

            } else {
                //*** ng upload ***
                alert('xhr2 upload is not supported, ngUpload will work, pending to implement...');
            }
        });
    }

    function fileDragDropUpload(scope, elem, attrs, baasAuth, baasRequest, Alert) {
        initScope(scope, attrs);

        getMediaData(baasRequest, scope, function (data) {
            scope.limit = data.maxFileSize;

            var holder = elem.find('div'),
                fileInput = elem.find('input');

            baasAuth
                .getUserInfo()
                .then(function (user) {
                    if (testCompat().draggable) {
                        holder[0].ondragover = function (event) {
                            holder.addClass('file-upload-dragover');
                            return false;
                        };

                        holder[0].ondrop = function (event) {
                            var type, file;
                            file = event.dataTransfer.files[0];
                            type = file.type;
                            holder.removeClass('file-upload-dragover');
                            event.preventDefault();
                            if (validateFileExt(scope, type, Alert)) {
                                readFiles(baasRequest, scope, data, event.dataTransfer.files, user);
                            }

                        };
                    } else {
                        holder.className = 'hidden';
                    }

                    bindFileChange(baasRequest, scope, user, fileInput, data, Alert);
                });
        });
    }

    baasStorage.directive(
        'fileUploadSimple',
        [
            'simsaw-baas-auth',
            'simsaw-baas-request',
            'Alert',
            function (baasAuth, baasRequest, Alert) {
                _alert = Alert;
                return {
                    restrict: 'EA',
                    scope: {onComplete: '&'},
                    transclude: true,
                    template: simpleTemplate,
                    link: function (scope, elem, attrs) {
                        fileUpload(scope, elem, attrs, baasAuth, baasRequest, Alert);
                    }
                };
            }
        ]
    );
    baasStorage.directive(
        'fileUpload',
        [
            'simsaw-baas-auth',
            'simsaw-baas-request',
            'Alert',
            function (baasAuth, baasRequest, Alert) {
                _alert = Alert;
                return {
                    restrict: 'EA',
                    scope: {onComplete: '&'},
                    template: fileUploadTemplate,
                    link: function (scope, elem, attrs) {
                        fileUpload(scope, elem, attrs, baasAuth, baasRequest, Alert);
                    }
                };
            }
        ]
    );

    // ref: http://html5demos.com/dnd-upload
    /**
     * .file-upload-drop {height:100px;width:200px;border: 1px dotted black}
     */

    baasStorage.directive(
        'fileUploadDragDrop',
        [
            'simsaw-baas-auth',
            'simsaw-baas-request',
            'Alert',
            function (baasAuth, baasRequest, Alert) {
                return {
                    restrict: 'EA',
                    scope: {onComplete: '&'},
                    template: fileUploadDDTemplate,
                    link: function (scope, elem, attrs) {
                        fileDragDropUpload(scope, elem, attrs, baasAuth, baasRequest, Alert);
                    }
                };
            }
        ]
    );

    baasStorage.directive(
        'fileUploadDragDropTransclude',
        [
            'simsaw-baas-auth',
            'simsaw-baas-request',
            'Alert',
            function (baasAuth, baasRequest, Alert) {
                return {
                    restrict: 'EA',
                    scope: {onComplete: '&'},
                    transclude: true,
                    template: fileUploadDDTransTemplate,
                    link: function (scope, elem, attrs) {
                        fileDragDropUpload(scope, elem, attrs, baasAuth, baasRequest, Alert);
                    }
                };
            }
        ]
    );

    /**
     * Sample syntax:
     * model can be object or array of objects, object must have properties "key" and "fileName"
     <div data-file-download data-fileInfo="model">
     <i class="glyphicon glyphicon-download"></i>
     {{fileName}}
     </div>
     */
    baasStorage.directive(
        'fileDownload',
        [
            '$rootScope',
            '$window',
            'simsaw-baas-request',
            'simsaw-baas-settings',
            function ($rootScope, $window, baasRequest, baasSettings) {
                return {
                    restrict: 'A',
                    scope: {fileInfo: '='},
                    link: function (scope, elem, attrs) {

                        scope.$watch('fileInfo', function () {
                            if (scope.fileInfo) {
                                init();
                            }
                        });

                        var url = baasSettings.baasUrl + '/storage/download-url?key={key}&fileName={fileName}',
                            isArray = false,
                            list = [];

                        function init() {

                            if (Object.prototype.toString.call(scope.fileInfo) === '[object Array]') {
                                isArray = true;
                            }

                            function appendAnchor(obj) {
                                var filename = obj.fileName;
                                filename = filename.replace(/[&\/\\,+()$~%.'":*?<>{}]/g, '_'); // replace special chars.

                                var href = url.replace('{key}', obj.key).replace('{fileName}', encodeURIComponent(filename)),
                                    anchor = angular.element('<a href="' + href + '" target="_blank" class="silent-download hidden">' + obj.fileName + '</a>');
                                elem.append(anchor);
                                anchor.bind('click', function (e) {
                                    if (e) {
                                        if (e.stopPropagation) {
                                            e.stopPropagation();
                                        } else {
                                            e.cancelBubble = true;
                                        }
                                    }
                                });
                            }

                            if (isArray) {
                                for(var i in scope.fileInfo) {
                                    appendAnchor(scope.fileInfo[i]);
                                }
                            } else {
                                appendAnchor(scope.fileInfo);
                            }

                            angular.element(elem[0]).bind('click', function (e) {
                                elem.children('a').each(function (index) {
                                    var anchor = angular.element(this);
                                    if (anchor.hasClass('silent-download')) {
                                        this.click();
                                    }
                                });

                            });
                        }
                    }
                };
            }
        ]
    );

    baasStorage.directive(
        'signedUrl',
        [
            '$rootScope',
            '$window',
            'simsaw-baas-request',
            'simsaw-baas-settings',
            function ($rootScope, $window, baasRequest, baasSettings) {
                return {
                    restrict: 'AE',
                    transclude: true,
                    template: '<a data-ng-href="{{url}}" target="_blank">' +
                        '<div ng-transclude></div>'+
                        '</a>',
                    scope: {key: '@', fileName: '@'},
                    link: function (scope) {
                        var url = baasSettings.baasUrl + '/storage/file-url?key={key}&fileName={fileName}';
                        scope.fileName = (scope.fileName && scope.fileName.replace(/[&\/\\,+()$~%'":*?<>{}]/g, '_')) || 'file-name';
                        scope.url = url.replace('{key}', scope.key).replace('{fileName}', encodeURIComponent(scope.fileName));
                    }
                };
            }
        ]
    );

    baasStorage.factory(
        'simsaw-baas-storage-resize-public-img',
        [
            'simsaw-baas-request',
            'Alert',
            function (baasRequest, alert) {

                var url = 'storage/resize-public-img';
                return function (urlsToResize, size, cb) {

                    if (!cb && typeof size === 'function') {
                        cb = size;
                        size = null;
                    }

                    baasRequest('POST', url, {urls: urlsToResize, size: size}, function (err, data) {
                        if (err) {
                            alert.error(err);
                        } else {
                            cb(data);
                        }
                    });
                };
            }
        ]
    );

    function initScope(scope, attrs) {
        scope.acl = attrs.acl;
        scope.provider = attrs.provider || "s3";
        scope.uploads = [];
        scope.pendingUploads = 0;
        scope.accept = attrs.accept;
    }

    function validateFileExt(scope, fileType, Alert) {
        var isValid = false;

        if (fileType && scope.accept) {
            var reg = new RegExp(scope.accept);
            isValid = reg.test(fileType);
        }

        if (!isValid ) {
            Alert.warning('File type is not supported');
            scope.$apply();
        }

        return isValid;
    }

    function bindFileChange (baasRequest, scope, user, fileInput, data, Alert) {
        fileInput.bind('change', function () {
            var self = this;
            if (validateFileExt(scope, self.files[0].type, Alert)) {
                readFiles(baasRequest, scope, data, self.files, user);
            } else {
                fileInput.val("");
            }
        });
    }

    function getMediaData(baasRequest, scope, fileExt, cb) {
        if (!cb && typeof fileExt === 'function') {
            cb = fileExt;
            fileExt = null;
        }

        var url = 'storage/' + scope.acl + '-upload?provider=' + scope.provider;

        if (fileExt) {
            url += "&fileExt=" + fileExt+"&stamp=" + (+new Date());
        }

        baasRequest('GET', url, function (err, data) {
            if (err) {
                _alert.error(err);
            } else {
                cb(data);
            }
        });
    }

    function testCompat() {
        return {
            fileReader: typeof FileReader !== 'undefined',
            draggable: 'draggable' in document.createElement('span'),
            formData: !!window.FormData,
            progress: "upload" in new XMLHttpRequest()
        };
    }

    function xhrRequest(method, url) {
        var xhr;
        xhr = new XMLHttpRequest();
        if (xhr.withCredentials !== null) {
            xhr.open(method, url, true);
        } else if (typeof XDomainRequest !== "undefined") {
            xhr = new XDomainRequest();
            xhr.open(method, url);
        } else {
            xhr = null;
        }
        return xhr;
    }

    function readMessage(responseText) {
        if (responseText) {
            var res = responseText.match(/<Message>([^<]+)<\/Message>/);
            if (res) {
                return res.length > 0 ? res[0].replace('<Message>', '').replace('</Message>', '') : '';
            }
            return responseText;
        }
        return '';
    }

    function getNewFileName(fileName) {
        var arr = fileName.split('.'),
            last = arr.length - 1,
            randString = +(new Date()) + utils.randomString();

        return randString + '.' + arr[last];
    }

    function readFiles(baasRequest, scope, data, files, user) {
        var i = 0;
        for (i; i < files.length; i++) {
            uploadFile(baasRequest, scope, data, files[i], user);
        }
    }

    function uploadFile(baasRequest, scope, data, file, user) {
        var key = '',
            stat,
            xhr;

        stat = {
            fileName: file.name,
            progress: 0,
            provider: scope.provider,
            key: null,
            host: data.host,
            url: data.host + key,
            uploading: true
        };

        scope.uploads.push(stat);
        scope.pendingUploads++;

        scope.$apply();

        if (scope.provider === 'manta') {
            var extArray = file.name.split('.'),
                ext = extArray[extArray.length - 1];

            getMediaData(baasRequest, scope, ext, function (media) {
                stat.key = media.key;
                var url = media.host + media.signature;
                xhr = xhrRequest('PUT', url);
                bindXhrEvents(xhr, scope, stat);

                xhr.setRequestHeader('accept', 'application/json');
                xhr.setRequestHeader('access-control-allow-origin', '*');
                xhr.setRequestHeader('content-type', file.type);
                xhr.send(file);
            });
        } else {
            xhr = xhrRequest('POST', data.host);
            bindXhrEvents(xhr, scope, stat);

            if (scope.acl === 'public-read') {
                key = 'public/';
            }

            if (user && user.id) {
                key += user.id + '/';
            }

            key += getNewFileName(file.name);

            stat.key = key;

            // build formData
            var formData = new FormData();
            formData.append('key', key);
            formData.append('AWSAccessKeyId', data.awsKey);
            formData.append('acl', scope.acl);
            formData.append('policy', data.policy);
            formData.append('signature', data.signature);
            formData.append('Content-Type', file.type);
            formData.append('file', file);
            xhr.send(formData);
        }
    }

    function bindXhrEvents(xhr, scope, stat) {
        xhr.onload = function (e) {
            if (xhr.status === 200 || xhr.status === 204) {
                stat.progress = 100;
                stat.uploading = false;
                scope.pendingUploads--;
                scope.$apply();

                if (scope.pendingUploads <= 0) {
                    scope.onComplete({files: scope.uploads});
                    scope.uploads = [];
                }
            } else {
                stat.fileName += ' Error: ' + readMessage(this.responseText);
                scope.$apply();
            }
        };

        xhr.onerror = function (e) {
            stat.progress = 0;
            stat.fileName += ' Error: ' + readMessage(this.responseText);
            scope.$apply();
        };

        xhr.upload.onprogress = function (e) {
            if (e.lengthComputable) {
                stat.progress = Math.round((e.loaded / e.total) * 100);
                scope.$apply();
            }
        };
    }
});
