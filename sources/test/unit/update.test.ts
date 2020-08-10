import { expect } from "@loopback/testlab";
import { juggler } from "@loopback/repository";

import { User } from "./test.model";
import { UserRepository } from "./test.repository";

describe("Update Model", async () => {
    const datasource: juggler.DataSource = new juggler.DataSource({
        name: "db",
        connector: "memory",
    });
    const userRepository = new UserRepository(User, datasource);

    it("updateAll() Test", async () => {
        /**
         * Test hard update two users using where
         */
    });

    it("update() Test", async () => {
        /**
         * Test hard update one user using entity
         */
    });

    it("updateById() Test", async () => {
        /**
         * Test hard update one user by id
         */
    });

    it("replaceById() Test", async () => {
        /**
         * Test hard replace one user by id
         */
    });
});
