var express = require('express');
var cors = require('cors');
var path = require('path');

var app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

var myUserId = 'omjeekumar_19072005';
var myEmail = 'omjee1364.be23@chitkarauniversity.edu.in';
var myRoll = '2311981364';

app.post('/bfhl', function(req, res) {
    var data = req.body.data;

    if (!Array.isArray(data)) {
        return res.status(400).json({ error: 'send an array please' });
    }

    var invalid = [];
    var dups = [];
    var seen = [];
    var parentMap = {};
    var childMap = {};
    var nodes = [];

    for (var i = 0; i < data.length; i++) {
        var entry = String(data[i]).trim();

        // check if its valid format like A->B
        if (entry.length !== 4 || entry[1] !== '-' || entry[2] !== '>') {
            invalid.push(String(data[i]));
            continue;
        }
        var from = entry[0];
        var to = entry[3];

        if (from < 'A' || from > 'Z' || to < 'A' || to > 'Z') {
            invalid.push(String(data[i]));
            continue;
        }

        if (from === to) {
            invalid.push(String(data[i]));
            continue;
        }

        var edgeStr = from + '->' + to;

        if (seen.indexOf(edgeStr) !== -1) {
            if (dups.indexOf(edgeStr) === -1) dups.push(edgeStr);
            continue;
        }
        seen.push(edgeStr);

        // diamond caseskip if child already has a parent
        if (parentMap[to] !== undefined) continue;

        parentMap[to] = from;
        if (!childMap[from]) childMap[from] = [];
        childMap[from].push(to);

        if (nodes.indexOf(from) === -1) nodes.push(from);
        if (nodes.indexOf(to) === -1) nodes.push(to);
    }

    // build undirected map to findgroups
    var undirMap = {};
    for (var n = 0; n < nodes.length; n++) {
        undirMap[nodes[n]] = [];
    }
    var plist = Object.keys(childMap);
    for (var p = 0; p < plist.length; p++) {
        var par = plist[p];
        var clist = childMap[par];
        for (var c = 0; c < clist.length; c++) {
            undirMap[par].push(clist[c]);
            undirMap[clist[c]].push(par);
        }
    }

    nodes.sort();
    var visited = [];
    var groups = [];

    for (var g = 0; g < nodes.length; g++) {
        if (visited.indexOf(nodes[g]) !== -1) continue;
        var group = [];
        var q = [nodes[g]];
        while (q.length > 0) {
            var cur = q.shift();
            if (group.indexOf(cur) !== -1) continue;
            group.push(cur);
            var nbrs = undirMap[cur] || [];
            for (var nb = 0; nb < nbrs.length; nb++) {
                if (group.indexOf(nbrs[nb]) === -1) q.push(nbrs[nb]);
            }
        }
        for (var v = 0; v < group.length; v++) visited.push(group[v]);
        groups.push(group);
    }

    var result = [];
    var numTrees = 0;
    var numCycles = 0;
    var deepestRoot = null;
    var deepestVal = -1;

    for (var gi = 0; gi < groups.length; gi++) {
        var grp = groups[gi];
        grp.sort();

        // find which nodes have a parwnt inside this group -> those are children
        var childrenInGrp = [];
        for (var xi = 0; xi < grp.length; xi++) {
            if (parentMap[grp[xi]] !== undefined && grp.indexOf(parentMap[grp[xi]]) !== -1) {
                childrenInGrp.push(grp[xi]);
            }
        }

        var rootNode = null;
        for (var ri = 0; ri < grp.length; ri++) {
            if (childrenInGrp.indexOf(grp[ri]) === -1) {
                rootNode = grp[ri];
                break;
            }
        }
        if (rootNode === null) rootNode = grp[0];

        // build local adj list for his group only
        var adj = {};
        for (var li = 0; li < grp.length; li++) {
            var ln = grp[li];
            if (childMap[ln]) {
                adj[ln] = [];
                for (var lc = 0; lc < childMap[ln].length; lc++) {
                    if (grp.indexOf(childMap[ln][lc]) !== -1) {
                        adj[ln].push(childMap[ln][lc]);
                    }
                }
            }
        }

        // Cycle Check using DFS
        var seenNodes = [];
        var stackNodes = [];
        var hasCycle = false;

        function dfsCheck(nd) {
            if (stackNodes.indexOf(nd) !== -1) { hasCycle = true; return; }
            if (seenNodes.indexOf(nd) !== -1) return;
            seenNodes.push(nd);
            stackNodes.push(nd);
            var nexts = adj[nd] || [];
            for (var di = 0; di < nexts.length; di++) {
                dfsCheck(nexts[di]);
                if (hasCycle) return;
            }
            stackNodes.splice(stackNodes.indexOf(nd), 1);
        }
        dfsCheck(rootNode);

        if (hasCycle) {
            result.push({ root: rootNode, tree: {}, has_cycle: true });
            numCycles++;
        } else {
            // build tree object
            function buildObj(nd, doneList) {
                doneList = doneList || [];
                if (doneList.indexOf(nd) !== -1) return {};
                doneList.push(nd);
                var obj = {};
                var ch = adj[nd] || [];
                for (var bi = 0; bi < ch.length; bi++) {
                    obj[ch[bi]] = buildObj(ch[bi], doneList);
                }
                return obj;
            }

            function calcDepth(nd, doneList) {
                doneList = doneList || [];
                if (doneList.indexOf(nd) !== -1) return 1;
                doneList.push(nd);
                var ch2 = adj[nd] || [];
                if (ch2.length === 0) return 1;
                var mx = 0;
                for (var di2 = 0; di2 < ch2.length; di2++) {
                    var dd = calcDepth(ch2[di2], doneList.slice());
                    if (dd > mx) mx = dd;
                }
                return 1 + mx;
            }

            var treeData = {};
            treeData[rootNode] = buildObj(rootNode, []);
            var dp = calcDepth(rootNode, []);

            result.push({ root: rootNode, tree: treeData, depth: dp });
            numTrees++;

            if (dp > deepestVal || (dp === deepestVal && rootNode < deepestRoot)) {
                deepestVal = dp;
                deepestRoot = rootNode;
            }
        }
    }

    result.sort(function(a, b) {
        if (a.has_cycle && !b.has_cycle) return 1;
        if (!a.has_cycle && b.has_cycle) return -1;
        if (a.root < b.root) return -1;
        return 1;
    });

    res.json({
        user_id: myUserId,
        email_id: myEmail,
        college_roll_number: myRoll,
        hierarchies: result,
        invalid_entries: invalid,
        duplicate_edges: dups,
        summary: {
            total_trees: numTrees,
            total_cycles: numCycles,
            largest_tree_root: deepestRoot || ''
        }
    });
});

app.get('/', function(req, res) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

var PORT = process.env.PORT || 3000;
app.listen(PORT, function() {
    console.log('running on ' + PORT);
});
