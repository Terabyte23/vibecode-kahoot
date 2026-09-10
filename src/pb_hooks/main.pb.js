// 1. Вход по никнейму
routerAdd("POST", "/api/host-login", (c) => {
    const data = $apis.requestInfo(c).data;
    const username = data.username;

    if (!username) {
        return c.json(400, { message: "Username on kohustuslik" });
    }

    try {
        const user = $app.dao().findFirstRecordByData("users", "username", username);
        const token = $tokens.recordAuthToken($app, user);

        return c.json(200, { token, record: user });
    } catch (e) {
        return c.json(404, { message: "Kasutajat ei leitud" });
    }
});

// 2. Регистрация нового учителя по никнейму
routerAdd("POST", "/api/host-register", (c) => {
    const data = $apis.requestInfo(c).data;
    const username = data.username;

    if (!username) {
        return c.json(400, { message: "Username on kohustuslik" });
    }

    // Проверяем, существует ли уже такой никнейм
    try {
        const existing = $app.dao().findFirstRecordByData("users", "username", username);
        if (existing) {
            return c.json(400, { message: "See hüüdnimi on juba võetud!" });
        }
    } catch (e) {
        // Ошибка поиска означает, что пользователя нет — продолжается создание
    }

    try {
        const collection = $app.dao().findCollectionByNameOrId("users");
        const record = new Record(collection);

        // Генерация случайного email и пароля для встроенных механизмов PocketBase
        const randomStr = Math.random().toString(36).substring(2, 10);
        record.set("username", username);
        record.set("email", `${username.toLowerCase()}_${randomStr}@quiz.local`);
        record.setPassword(`Pass_${randomStr}_123`);

        $app.dao().saveRecord(record);

        const token = $tokens.recordAuthToken($app, record);
        return c.json(200, { token, record });
    } catch (e) {
        return c.json(500, { message: "Kasutaja loomine ebaõnnestus: " + e.message });
    }
});