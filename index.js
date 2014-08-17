var freebase = (function() {

        var freebase = require("./src/core")
        freebase.OAuth2 = require("./src/oauth2");
        var add_methods = function(obj) {
            Object.keys(obj).forEach(function(k) {
                freebase[k] = obj[k]
            })
        }
        add_methods(require("./src/sugar"))
        add_methods(require("./src/geo"))
        add_methods(require("./src/graph"))
        //these two aren't included on the clientside
        add_methods(require("./src/wikipedia"))
        add_methods(require("./src/write"))

        // export for Node.js
        if (typeof module !== 'undefined' && module.exports) {
            module.exports = freebase;
        }
        return freebase;
    })()
    // freebase.grammar("toronto maple leafs")
    // console.log(Object.keys(freebase))
    // freebase.wikipedia_categories("Thom Yorke", {}, console.log) //****
    // freebase.documentation()
