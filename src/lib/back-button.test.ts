import { expect, test } from "bun:test";
import { pressBack, pushBackHandler } from "./back-button";

test("back press is consumed by the most recently opened handler", () => {
  const log: string[] = [];
  const offQuit = pushBackHandler(() => {
    log.push("quit");
    return true;
  });
  const offSearch = pushBackHandler(() => {
    log.push("search");
    return true;
  });
  const offModal = pushBackHandler(() => {
    log.push("modal");
    return true;
  });

  expect(pressBack()).toBe(true);
  expect(log).toEqual(["modal"]);

  offModal();
  expect(pressBack()).toBe(true);
  expect(log).toEqual(["modal", "search"]);

  offSearch();
  offQuit();
  // Nothing left to go back to: the caller is told to close the app.
  expect(pressBack()).toBe(false);
});

test("a handler that throws does not block navigation", () => {
  const log: string[] = [];
  const offBroken = pushBackHandler(() => {
    throw new Error("boom");
  });
  const offBase = pushBackHandler(() => {
    log.push("base");
    return true;
  });

  expect(pressBack()).toBe(true);
  expect(log).toEqual(["base"]);

  offBroken();
  offBase();
});
