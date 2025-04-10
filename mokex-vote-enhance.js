// @name         Mokex Vote Enhance Plugin
// @version      1.0.0
// @author       YourName
// @description  合并替换投票接口、动态替换用户信息和选票结果的中间人劫持脚本，用于 Loon MITM
// @homepage     https://github.com/YourGitHubRepo
// @license      MIT

(function() {
    // 获取请求 URL 和响应体内容
    let url = $request.url;
    let body = $response.body;

    // 脚本一：投票入口预检查替换
    function handleResponsePreCheck(b) {
        // 替换 "票数已用尽" 为 ""
        b = b.replace(/"票数已用尽"/g, '""');
        // 替换 "false" 为 "true"
        b = b.replace(/"false"/g, '"true"');
        // 替换 "190006" 为 "000000"
        b = b.replace(/"190006"/g, '"000000"');
        return b;
    }

    // 脚本二：支持反复投票（将已投 chosen 替换为 false）
    function handleResponseCampaign(b) {
        b = b.replace(/"chosen"\s*:\s*true,/g, '"chosen": false,');
        return b;
    }

    // 脚本三：动态替换用户信息
    function generateRandomUsername(seed) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let username = '';
        for (let i = 0; i < 8; i++) {
            username += chars.charAt((seed + i) % chars.length);
        }
        return username;
    }

    function generateRandomId(seed) {
        const base = 100000000;
        const range = 900000000;
        let randomValue = (seed * 123456789) % range + base;
        return randomValue.toString();
    }

    function getCurrentTimestamp() {
        return Math.floor(new Date().getTime() / 1000);
    }

    function getFixedRandomValues() {
        const currentTime = getCurrentTimestamp();
        const twoMinutes = 240; // 2分钟的秒数
        const baseTime = Math.floor(currentTime / twoMinutes) * twoMinutes;
        return {
            randomUsername: generateRandomUsername(baseTime),
            randomId: generateRandomId(baseTime)
        };
    }

    function handleResponseUser(b) {
        const { randomUsername, randomId } = getFixedRandomValues();
        // 替换 "User-b29uu" 为随机用户名
        b = b.replace(/"User-b29uu"/g, `"${randomUsername}"`);
        // 替换 570933983 为随机数字ID
        b = b.replace(/570933983/g, randomId);
        return b;
    }

    // 脚本四：替换选票结果，将指定目标（例如 Safe）的 chosen 改为 true
    function markTargetChosen(b, targetName) {
        try {
            const obj = JSON.parse(b);
            const options = obj && obj.data && obj.data.listCoinPollVO && obj.data.listCoinPollVO.options;
            if (options && Array.isArray(options)) {
                // 定义目标名称与 id 的映射，需根据实际情况调整
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
                const targetId = map[targetName];
                if (targetId) {
                    for (let opt of options) {
                        if (opt.id === targetId) {
                            opt.chosen = true;
                            break;
                        }
                    }
                }
            }
            return JSON.stringify(obj);
        } catch (e) {
            return b;
        }
    }

    // 分支判断：根据 URL 对应不同操作
    if (/\/bapi\/composite\/v1\/private\/pgc\/content\/list\/coin\/vote\/preCheck/.test(url)) {
        // 脚本一应用：预检查接口
        body = handleResponsePreCheck(body);
    } else if (/\/bapi\/composite\/v1\/friendly\/pgc\/campaign\/info/.test(url)) {
        // 脚本二应用：反复投票接口
        body = handleResponseCampaign(body);
    } else if (/\/bapi\/composite\/v1\/private\/pgc\/content\/list\/coin\/vote$/.test(url)) {
        // 脚本四应用：选票结果替换（此处以目标 "Safe" 为例，可根据需要调整）
        body = markTargetChosen(body, "Safe");
    }
    // 脚本三通用：统一替换用户信息（建议所有接口都进行用户信息替换）
    body = handleResponseUser(body);

    // 返回修改后的响应体
    $done({body: body});
})();
