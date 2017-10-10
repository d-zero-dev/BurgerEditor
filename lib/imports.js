"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("./polyfill");
function imports(el, data, attr) {
    el = el.cloneNode(true);
    var _loop_1 = function (dataKeyName) {
        if (data.hasOwnProperty(dataKeyName)) {
            var datum_1 = data[dataKeyName];
            var selector = "[data-" + attr + "*=\"" + dataKeyName + "\"]";
            var targetList = el.querySelectorAll(selector);
            if (Array.isArray(datum_1)) {
                var targetEl = targetList[0];
                if (!targetEl) {
                    return "continue";
                }
                var listRoot_1 = targetEl.closest("[data-" + attr + "-list]");
                if (!listRoot_1 || listRoot_1 && !listRoot_1.children.length) {
                    return "continue";
                }
                var listItem = listRoot_1.children[0].cloneNode(true);
                while (datum_1.length > listRoot_1.children.length) {
                    listRoot_1.appendChild(listItem.cloneNode(true));
                }
                var newChildren = listRoot_1.querySelectorAll(selector);
                Array.from(newChildren).forEach(function (child, i) {
                    if (datum_1[i] != null) {
                        datumToElement(dataKeyName, datum_1[i] || '', child, attr);
                    }
                    else {
                        listRoot_1.children[i].remove();
                    }
                });
            }
            else {
                Array.from(targetList).forEach(function (targetEl, i) {
                    datumToElement(dataKeyName, datum_1, targetEl, attr);
                });
            }
        }
    };
    for (var dataKeyName in data) {
        _loop_1(dataKeyName);
    }
    return el;
}
exports.imports = imports;
/**
 *
 */
function datumToElement(name, datum, el, attr) {
    var nodeName = el.nodeName.toLowerCase();
    var bindingFormats = el.getAttribute("data-" + attr) || '';
    for (var _i = 0, _a = bindingFormats.split(/\s*,\s*/); _i < _a.length; _i++) {
        var bindingFormat = _a[_i];
        bindingFormat = bindingFormat.trim();
        /**
         * 抽出した対象キー
         */
        var key = void 0;
        /**
         * 対象属性
         *
         * `null`の場合は`innerHTML`が対象となる
         * ただし要素がinput要素の場合は`value`に設定
         */
        var targetAttr = void 0;
        //
        // 対象属性名の抽出
        //
        if (/^[a-z_-](?:[a-z0-9_-])*:[a-z_-](?:[a-z0-9_-])*(?:\([a-z-]+\))?/i.test(bindingFormat)) {
            var splitKey = bindingFormat.split(':');
            key = splitKey[0].trim();
            targetAttr = splitKey[1].trim();
        }
        else {
            key = bindingFormat.trim();
            targetAttr = null;
        }
        //
        // 対象キーが一致しなければスキップする
        //
        if (name !== key) {
            continue;
        }
        //
        // 属性による対応
        //
        if (targetAttr) {
            //
            // style属性
            //
            if (/^style\([a-z-]+\)$/i.test(targetAttr)) {
                var cssPropertyName = targetAttr.replace(/^style\(([a-z-]+)\)$/i, '$1');
                var cssValue = "" + datum;
                switch (cssPropertyName) {
                    case 'background-image': {
                        //
                        // NGパターン
                        // $changeDom.css(cssPropertyName, 'url("' + value + '")');
                        //
                        // cssメソッドを経由すると styleAPIを使用するので URLがホストを含めた絶対パスになる
                        // デモサーバーから本番サーバーへの移行ができなくなってしまうので避ける
                        // 単純な文字列を流し込む（setAttributeを利用）
                        // urlはマルチバイト文字や空白記号を含まないはずであるがエスケープする
                        var url = encodeURI("" + datum);
                        cssValue = "url(" + url + ")";
                        break;
                    }
                    //
                    // TODO: 他にもvalueに単位が必要なケースなどに対応したい
                    //
                    default: {
                        // void
                    }
                }
                el.setAttribute('style', cssPropertyName + ": " + cssValue);
                //
                // data-*属性
                //
            }
            else if (/^data-/.test(targetAttr)) {
                el.setAttribute(targetAttr, "" + datum);
                //
                // 一般属性
                //
            }
            else {
                switch (targetAttr) {
                    case 'hidden': {
                        el.hidden = !!datum;
                        break;
                    }
                    case 'checked': {
                        el.checked = !!datum;
                        break;
                    }
                    case 'disabled': {
                        el.disabled = !!datum;
                        break;
                    }
                    case 'download': {
                        // typeof changeDom.download === 'string'
                        if (datum) {
                            el.download = 'true';
                        }
                        else {
                            el.removeAttribute('download');
                        }
                        break;
                    }
                    case 'target': {
                        if (datum === '_blank') {
                            el.target = '_blank';
                        }
                        else {
                            el.removeAttribute('target');
                        }
                        break;
                    }
                    default: {
                        el.setAttribute(targetAttr, "" + datum);
                    }
                }
            }
            //
            // 属性指定がない場合
            //
        }
        else {
            if (nodeName === 'input') {
                el.value = "" + datum;
            }
            else {
                el.innerHTML = "" + datum;
            }
        }
    }
}
