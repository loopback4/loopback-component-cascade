import { expect } from "@loopback/testlab";
import { juggler } from "@loopback/repository";

import { User } from "./test.model";
import { UserRepository } from "./test.repository";

describe("Delete Model", async () => {
    const datasource: juggler.DataSource = new juggler.DataSource({
        name: "db",
        connector: "memory",
    });
    const userRepository = new UserRepository(User, datasource);

    it("deleteAll() Test", async () => {
        /**
         * Test soft delete two users using where
         */
    });

    it("delete() Test", async () => {
        /**
         * Test soft delete one user using entity
         */
    });

    it("deleteById() Test", async () => {
        /**
         * Test soft delete one user using id
         */
    });
});
