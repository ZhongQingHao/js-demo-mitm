let body = $response.body;

// 工具函数
function generateRandomUsername(seed) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({length: 8}, (_, i) => chars.charAt((seed + i) % chars.length)).join('');
}

function generateRandomId(seed) {
    const base = 100000000;
    const range = 900000000;
    return ((seed * 123456789) % range + base).toString();
}

function getRandomUserInfo() {
    const t = Math.floor(Date.now() / 1000 / 240) * 240;
    return {
        username: generateRandomUsername(t),
        uid: generateRandomId(t)
    };
}

function replaceVotePreCheck(b) {
    return b.replace(/"票数已用尽"/g, '""')
            .replace(/"false"/g, '"true"')
            .replace(/"190006"/g, '"000000"');
}

function replaceChosenFalse(b) {
    return b.replace(/"chosen"\s*:\s*true,/g, '"chosen": false,');
}

function replaceUserInfo(b, newUsername, newUid) {
    return b.replace(/"User-b29uu"/g, `"${newUsername}"`)
            .replace(/570933983/g, newUid);
}

function markTargetChosen(b, targetName) {
    try {
        const obj = JSON.parse(b);
        const options = obj?.data?.listCoinPollVO?.options;
        if (options && Array.isArray(options)) {
            const map = {
                "Safe": 8,
                "Virtual": 1,
                "BigTime": 2,
                "UXLINK": 3,
                "Morpho": 4,
                "Grass": 5,
                "Aethir": 6,
                "Walrus": 7
            };
            const id = map[targetName];
            if (id) {
                for (const opt of options) {
                    if (opt.id === id) {
                        opt.chosen = true;
                        break;
                    }
                }
            }
        }
        return JSON.stringify(obj);
    } catch (_) {
        return b;
    }
}

const url = $request.url;
const { username, uid } = getRandomUserInfo();

if (/vote\/preCheck/.test(url)) {
    body = replaceVotePreCheck(body);
} else if (/campaign\/info/.test(url)) {
    body = replaceChosenFalse(body);
} else if (/bapi\/composite\/v1\/private\/pgc\/content\/list\/coin\/vote$/.test(url)) {
    body = markTargetChosen(body, "Safe");  // 替换为目标项目名
}

body = replaceUserInfo(body, username, uid);

$done({ body });
