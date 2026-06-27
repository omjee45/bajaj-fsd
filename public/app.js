var apiUrl = '/bfhl';

var inputBox = document.getElementById('node-input');
var submitBtn = document.getElementById('submit-btn');
var clearBtn = document.getElementById('clear-btn');
var retryBtn = document.getElementById('retry-btn');
var loader = document.getElementById('loading-overlay');
var errorBox = document.getElementById('error-card');
var errMsg = document.getElementById('error-msg');
var resultDiv = document.getElementById('success-content');
var userIdTd = document.getElementById('res-user-id');
var emailTd = document.getElementById('res-email');
var rollTd = document.getElementById('res-roll');
var treesNum = document.getElementById('stat-trees');
var cyclesNum = document.getElementById('stat-cycles');
var largestNum = document.getElementById('stat-largest');
var treesList = document.getElementById('hierarchies-container');
var invalidDiv = document.getElementById('invalid-list');
var dupDiv = document.getElementById('duplicate-list');
var jsonPre = document.getElementById('raw-json');

document.getElementById('preset-basic').onclick = function() {
    inputBox.value = 'A->B, A->C, B->D, C->E';
};
document.getElementById('preset-cycle').onclick = function() {
    inputBox.value = 'X->Y, Y->Z, Z->X';
};
document.getElementById('preset-full').onclick = function() {
    inputBox.value = 'A->B, A->C, B->D, C->E, E->F, X->Y, Y->Z, Z->X, P->Q, Q->R, G->H, G->H, G->I, hello, 1->2, A->';
};
document.getElementById('preset-diamond').onclick = function() {
    inputBox.value = 'A->D, B->D, A->B, C->E, C->F';
};

submitBtn.onclick = sendRequest;
retryBtn.onclick = sendRequest;

clearBtn.onclick = function() {
    inputBox.value = '';
    errorBox.classList.add('hidden');
    resultDiv.classList.add('hidden');
};

inputBox.onkeydown = function(e) {
    if (e.ctrlKey && e.key === 'Enter') sendRequest();
};

function sendRequest() {
    var text = inputBox.value.trim();
    if (text === '') {
        inputBox.style.borderColor = 'red';
        setTimeout(function() { inputBox.style.borderColor = ''; }, 900);
        return;
    }

    var raw = text.split(/[\n,]+/);
    var data = [];
    for (var i = 0; i < raw.length; i++) {
        var s = raw[i].trim();
        if (s !== '') data.push(s);
    }

    loader.classList.remove('hidden');
    submitBtn.disabled = true;
    errorBox.classList.add('hidden');
    resultDiv.classList.add('hidden');

    fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: data })
    })
    .then(function(response) {
        return response.json().then(function(json) {
            if (!response.ok) throw new Error(json.error || 'server error');
            return json;
        });
    })
    .then(function(json) {
        showData(json);
    })
    .catch(function(err) {
        errorBox.classList.remove('hidden');
        errMsg.textContent = err.message;
        errorBox.scrollIntoView({ behavior: 'smooth' });
    })
    .finally(function() {
        loader.classList.add('hidden');
        submitBtn.disabled = false;
    });
}

function showData(resp) {
    resultDiv.classList.remove('hidden');

    userIdTd.textContent = resp.user_id;
    emailTd.textContent = resp.email_id;
    rollTd.textContent = resp.college_roll_number;

    var s = resp.summary;
    treesNum.textContent = s ? s.total_trees : 0;
    cyclesNum.textContent = s ? s.total_cycles : 0;
    largestNum.textContent = s ? s.largest_tree_root : '-';

    drawTrees(resp.hierarchies || []);

    fillTags(invalidDiv, resp.invalid_entries || [], 'tag-invalid');
    fillTags(dupDiv, resp.duplicate_edges || [], 'tag-duplicate');

    jsonPre.textContent = JSON.stringify(resp, null, 2);
    resultDiv.scrollIntoView({ behavior: 'smooth' });
}

function drawTrees(list) {
    treesList.innerHTML = '';

    if (!list.length) {
        treesList.innerHTML = '<p style="color:#999">nothing to show</p>';
        return;
    }

    for (var i = 0; i < list.length; i++) {
        var item = list[i];
        var isCycle = item.has_cycle === true;
        var typeBadge = isCycle ? '<span class="badge badge-cycle">Cycle</span>' : '<span class="badge badge-tree">Tree</span>';
        var depthBadge = '';
        if (!isCycle && item.depth) depthBadge = '<span class="badge badge-depth">Depth ' + item.depth + '</span>';

        var bodyHtml;
        if (isCycle) {
            bodyHtml = '<div class="cycle-note"><div class="cycle-dot"></div>Cycle detected — tree not available</div>';
        } else {
            bodyHtml = '<div class="tree-pre">' + treeToText(item.tree, item.root) + '</div>';
        }

        var wrapper = document.createElement('div');
        wrapper.className = 'h-item ' + (isCycle ? 'is-cycle' : 'is-tree');
        wrapper.innerHTML =
            '<div class="h-header">' +
                '<div class="h-badge">' + item.root + '</div>' +
                '<div class="h-meta">' +
                    '<div class="h-root">Root: ' + item.root + '</div>' +
                    '<div class="h-sub">' + (isCycle ? 'Cyclic group' : 'Non-cyclic tree') + '</div>' +
                '</div>' +
                '<div class="h-tags">' + typeBadge + depthBadge + '</div>' +
            '</div>' +
            '<div class="h-body">' + bodyHtml + '</div>';

        var hdr = wrapper.querySelector('.h-header');
        var bdy = wrapper.querySelector('.h-body');
        hdr.onclick = function() {
            if (this.nextSibling.style.display === 'none') {
                this.nextSibling.style.display = '';
            } else {
                this.nextSibling.style.display = 'none';
            }
        };

        treesList.appendChild(wrapper);
    }
}

function treeToText(obj, root) {
    var rootKids = obj[root] || {};
    var out = [];
    out.push('<span class="node-root">' + root + '</span>');
    var kkeys = Object.keys(rootKids);
    for (var i = 0; i < kkeys.length; i++) {
        var last = (i === kkeys.length - 1);
        printNode(kkeys[i], rootKids[kkeys[i]], '', last, out);
    }
    return out.join('\n');
}

function printNode(name, kids, pfx, isLast, out) {
    var line = isLast ? '└── ' : '├── ';
    var kkeys = Object.keys(kids);
    var spanClass = kkeys.length === 0 ? 'node-leaf' : 'node-child';
    out.push('<span class="node-conn">' + pfx + line + '</span><span class="' + spanClass + '">' + name + '</span>');
    var newPfx = pfx + (isLast ? '    ' : '│   ');
    for (var i = 0; i < kkeys.length; i++) {
        printNode(kkeys[i], kids[kkeys[i]], newPfx, i === kkeys.length - 1, out);
    }
}

function fillTags(container, items, cls) {
    container.innerHTML = '';
    if (!items.length) {
        container.innerHTML = '<span class="tag-none">none</span>';
        return;
    }
    for (var i = 0; i < items.length; i++) {
        var el = document.createElement('span');
        el.className = 'tag ' + cls;
        el.textContent = items[i];
        container.appendChild(el);
    }
}
