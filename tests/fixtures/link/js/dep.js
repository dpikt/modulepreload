import { world } from "./secondary-dep.js";
import { foo } from "/absolute-dep.js";

// Export function hello
export function hello() {
    return "hello" + world();
}