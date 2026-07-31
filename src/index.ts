import { Hono } from "hono";
import { langFromPath } from "./config/site";
import { renderError, renderNotFound } from "./layout/render";
import { api } from "./routes/api";
import { pages } from "./routes/pages";

const app = new Hono();

// api 先挂载：/api/* 未命中时返回 JSON 404，而不是落入页面路由
app.route("/", api);
app.route("/", pages);

app.notFound((c) => c.html(renderNotFound(langFromPath(c.req.path)), 404));

app.onError((_err, c) => c.html(renderError(langFromPath(c.req.path)), 500));

export default app;
