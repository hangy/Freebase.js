// export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    var freebase = require("./core")
    var fns = require('./helpers/helpers');
}


if (typeof freebase == 'undefined' || !freebase || !freebase.search) {
    console.warn('freebase sugar methods loaded without freebase core methods')
    freebase = {}
}

freebase.wikipedia_categories = function(q, options, callback) {
    this.doc = "get the wikipedia categories for a topic"
    var ps = fns.settle_params(arguments, freebase.wikipedia_categories, {});
    if (ps.array) {
        return fns.doit_async(ps);
    }
    if (!ps.valid) {
        return ps.callback({});
    }
    //if its not a wikipedia title, reuse get-topic logic for searches/ids
    // if (ps.q.match(/ /) || ps.q.substr(0, 1) == ps.q.substr(0, 1).toLowerCase() || ps.q.match(/^\//)) {
    //   return freebase.wikipedia_page(ps.q, options, function(r) {
    //     freebase.wikipedia_categories(r, options, ps.callback)
    //   })
    // }
    var url = freebase.globals.wikipedia_host + '?action=query&prop=categories&format=json&clshow=!hidden&cllimit=200&titles=' + encodeURIComponent(ps.q);
    if (ps.options.debug) {
      console.log(url)
    }
    fns.http(url, ps.options, function(r) {
        if (!r || !r.query || !r.query.pages || !r.query.pages[Object.keys(r.query.pages)[0]]) {
            return ps.callback([])
        }
        var cats = r.query.pages[Object.keys(r.query.pages)[0]].categories || []
        cats = cats.map(function(v) {
            return v.title
        })
        return ps.callback(cats)
    })
}
// freebase.wikipedia_categories(["Thom Yorke","Toronto"], {}, console.log)
// freebase.wikipedia_categories("Thom Yorke", {}, console.log) //****

freebase.wikipedia_links = function(q, options, callback) {
    this.doc = "outgoing links from this wikipedia page, converted to freebase ids"
    // callback = callback || console.log;
    var ps = fns.settle_params(arguments, freebase.wikipedia_links, {});
    if (!q) {
        return ps.callback({})
    }
    //handle an array
    if (fns.isarray(q) && q.length > 1) {
        return fns.doit_async(ps)
    }
    //if its not a wikipedia title, reuse get-topic logic for searches/ids
    if (q.match(/ /) || q.substr(0, 1) == q.substr(0, 1).toLowerCase() || q.match(/^\//)) {
        return freebase.wikipedia_page(q, ps.options, function(r) {
            freebase.wikipedia_links(r, ps.options, ps.callback)
        })
    }
    var url = freebase.globals.wikipedia_host + '?action=query&prop=links&format=json&plnamespace=0&pllimit=500&titles=' + encodeURIComponent(q);
    if(ps.options.debug) {
        console.log(url)
    }
    fns.http(url, ps.options, function(r) {
        if (!r || !r.query || !r.query.pages || !r.query.pages[Object.keys(r.query.pages)[0]]) {
            return ps.callback([])
        }
        var links = r.query.pages[Object.keys(r.query.pages)[0]].links || []
            //filter-out non-freebase topics
        links = links.filter(function(v) {
            return v.title.match(/^List of /i) == null
        })
        links = links.map(function(o) {
            o.id = "/wikipedia/en/" + freebase.mql_encode(o.title.replace(/ /g, '_'));
            o.name = o.title;
            delete o.title;
            delete o.ns;
            return o
        })
        return ps.options.nodeCallback ? ps.callback(null, links) : ps.callback(links)
    })
}
// freebase.wikipedia_links("Toronto", {}, console.log)
// freebase.wikipedia_links("Toronto", {nodeCallback:true}, function(err,r){console.log(r)})

freebase.wikipedia_external_links = function(q, options, callback) {
    this.doc = "outgoing links from this wikipedia page, converted to freebase ids"
    var ps = fns.settle_params(arguments, freebase.wikipedia_external_links, {});
    if (!q) {
        return ps.callback({})
    }
    options = options || {};
    //handle an array
    if (fns.isarray(q) && q.length > 1) {
        return fns.doit_async(ps)
    }
    //if its not a wikipedia title, reuse get-topic logic for searches/ids
    if (q.match(/ /) || q.substr(0, 1) == q.substr(0, 1).toLowerCase() || q.match(/^\//)) {
        return freebase.wikipedia_page(q, ps.options, function(r) {
            freebase.wikipedia_external_links(r, ps.options, ps.callback)
        })
    }
    var url = freebase.globals.wikipedia_host + '?action=query&prop=extlinks&format=json&ellimit=500&titles=' + encodeURIComponent(q);
    if(ps.options.debug) {
        console.log(url)
    }
    fns.http(url, ps.options, function(r) {
        if (!r || !r.query || !r.query.pages || !r.query.pages[Object.keys(r.query.pages)[0]]) {
            return ps.options.nodeCallback ? ps.callback(null, []) : ps.callback([])
        }
        var links = r.query.pages[Object.keys(r.query.pages)[0]].extlinks || []
        links = links.filter(function(v) {
            return v["*"].match(/^http/)
        })
        links = links.map(function(v) {
            var box = fns.parseurl(v["*"]);
            return {
                url: v["*"],
                domain: box.host
            }
        })
        return ps.options.nodeCallback ? ps.callback(null, links) : ps.callback(links)
    })
}
// freebase.wikipedia_external_links("Toronto")
// freebase.wikipedia_external_links("Toronto", {nodeCallback:true}, function(r,r2){console.log(r)})




freebase.from_category = function(q, options, callback) {
    this.doc = "get the freebase topics in a wikipedia category"
    var ps = fns.settle_params(arguments, freebase.from_category, {
        depth: 1
    });
    if (ps.array) {
        return fns.doit_async(ps);
    }
    if (!ps.valid) {
        return ps.callback({});
    }
    //if its not a wikipedia category
    if (!ps.q.match(/Category:/)) {
        ps.q = 'Category:' + ps.q
    }
    var all_topics = [];
    var all_cats = [
        []
    ];
    var done = function(list) {
        //unique the list
        var flags = {};
        list = list.filter(function(entry) {
            if (flags[entry.id]) {
                return false;
            }
            flags[entry.id] = true;
            return true;
        });
        return ps.callback(list)
    }
    var depth = 0
    iterate(ps.q)

    function iterate(cat) {
        // console.log('level ' + depth + '. doing ' + cat)
        var url = freebase.globals.wikipedia_host + "?action=query&list=categorymembers&format=json&cmlimit=400&cmtitle=" + encodeURIComponent(cat)
        fns.http(url, ps.options, function(r) {
            if (!r || !r.query || !r.query.categorymembers || !r.query.categorymembers[Object.keys(r.query.categorymembers)[0]]) {
                return ps.callback([])
            }
            var new_cats = r.query.categorymembers.filter(function(v) {
                return v.ns == 14
            })
            new_cats = new_cats.map(function(c) {
                return c.title
            })
            all_cats[depth + 1] = all_cats[depth + 1] || []
            all_cats[depth + 1] = all_cats[depth + 1].concat(new_cats);

            var topics = r.query.categorymembers.filter(function(v) {
                return v.ns == 0
            });
            topics = topics.map(function(v) {
                return {
                    id: "/wikipedia/en/" + freebase.mql_encode(v.title),
                    article: 'http://en.wikipedia.org/wiki/index.html?curid=' + v.pageid,
                    name: v.title,
                    category: cat,
                    depth: depth
                }
            })
            all_topics = all_topics.concat(topics);

            if (depth >= ps.options.depth || all_cats.length == 0) {
                return done(all_topics)
            } else {
                //do the next cat
                if (all_cats[depth].length) {
                    var new_cat = all_cats[depth][0]
                    all_cats[depth] = all_cats[depth].slice(1, all_cats[depth].length)
                    iterate(new_cat) //recurse
                } else { //theres no more cats at this level
                    //do next level
                    if (depth < ps.options.depth && all_cats[depth + 1].length) {
                        depth += 1
                        var new_cat = all_cats[depth][0]
                        all_cats[depth] = all_cats[depth].slice(1, all_cats[depth].length)
                        iterate(new_cat) //recurse
                    } else {
                        return done(all_topics)
                    }

                }
            }
        })
    }
}
// freebase.from_category("Category:Redirects_from_plurals")



freebase.wikipedia_subcategories = function(q, options, callback) {
    this.doc = "find the subcategories of this wikipedia category"
    var ps = fns.settle_params(arguments, freebase.wikipedia_subcategories, {
        depth: 1,
        already: []
    });
    if (ps.array) {
        return fns.doit_async(ps);
    }
    if (!ps.valid) {
        return ps.callback({});
    }
    //if its not a wikipedia category
    if (!ps.q.match(/Category:/)) {
        ps.q = 'Category:' + ps.q
    }
    var url = freebase.globals.wikipedia_host + "?action=query&list=categorymembers&format=json&cmlimit=400&cmnamespace=14&cmtitle=" + encodeURIComponent(ps.q);
    if(ps.options.debug) {
      console.log(url)
    }
    fns.http(url, ps.options, function(r) {
        if (!r || !r.query || !r.query.categorymembers || !r.query.categorymembers[Object.keys(r.query.categorymembers)[0]]) {
            return ps.callback([]);
        }
        var cats = r.query.categorymembers.map(function(v) {
            return v.title
        });
        //remove if done already (for recursive cats)
        cats = cats.filter(function(v) {
            return !fns.isin(v, ps.options.already)
        })
        ps.options.already = fns.compact_strong(fns.flatten(ps.options.already.concat(cats)));
        if (ps.options.depth > 1 && cats.length > 0) {
            ps.options.depth = ps.options.depth - 1;
            return freebase.wikipedia_subcategories(cats, ps.options, function(r) {
                ps.options.already = ps.options.already.concat(r)
                return ps.callback(fns.compact_strong(fns.flatten(ps.options.already)));
            })
        } else {
            return ps.callback(ps.options.already)
        }
    })
}
// freebase.wikipedia_subcategories("Category:Enzymes",{depth:2},function(r){console.log(JSON.stringify(r))})
//freebase.wikipedia_subcategories(["Category:Toronto","Category:Vancouver"])



freebase.wikipedia_to_freebase = function(q, options, callback) {
    this.doc = "turn a wikipedia title or url into a freebase topic"
    var ps = fns.settle_params(arguments, freebase.wikipedia_to_freebase, {
        depth: 1
    });
    if (ps.array) {
        return fns.doit_async(ps);
    }
    if (!ps.valid) {
        return ps.callback({});
    }

    options = options || {};
    options.lang = options.lang || "en";

    var regex = /^https?:\/\/([a-z]+)\.wikipedia\.org\/wiki\/(.*)/;
    var match = regex.exec(ps.q);
    if (match) {
        var lang = match[1];
        var title = decodeURIComponent(match[2]);
        var obj = {
            id: "/wikipedia/" + lang + "/" + freebase.mql_encode(title),
            name: title
        };
        return ps.callback(obj)
    } else {
        regex = /^\/wiki\/(.*)/;
        match = regex.exec(ps.q);
        if (match) {
           var title = decodeURIComponent(match[1]);
           var obj = {
               id: "/wikipedia/" + options.lang + "/" + freebase.mql_encode(title),
               name: title
           };
           return ps.callback(obj)
       } else {
            ps.q = ps.q.replace(/^https?:\/\/..\.wikipedia\.org\/wiki\//, '');
            var title = ps.q;
            var obj = {
                id: "/wikipedia/" + options.lang + "/" + freebase.mql_encode(ps.q),
                 name: title
            };
            return ps.callback(obj);
        }
    }
}
// freebase.wikipedia_to_freebase("Tony Hawk") => /wikipedia/en/Tony_Hawk
// freebase.wikipedia_to_freebase("Tony Hawk", { lang: "de" }) => /wikipedia/de/Tony_Hawk
// freebase.wikipedia_to_freebase("http://ru.wikipedia.org/wiki/%D0%A5%D0%BE%D1%83%D0%BA%2C_%D0%A2%D0%BE%D0%BD%D0%B8"); => /wikipedia/ru/$0425$043E$0443$043A$002C_$0422$043E$043D$0438
// freebase.wikipedia_to_freebase("/wiki/%D7%A1%D7%A7%D7%99%D7%99%D7%98%D7%91%D7%95%D7%A8%D7%93%D7%99%D7%A0%D7%92", { lang: "he" }) => /wikipedia/he/$05E1$05E7$05D9$05D9$05D8$05D1$05D5$05E8$05D3$05D9$05E0$05D2

if (typeof module !== 'undefined' && module.exports) {
    module.exports = freebase
}
