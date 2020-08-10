import { expect } from "@loopback/testlab";
import { juggler } from "@loopback/repository";

import { User } from "./test.model";
import { UserRepository } from "./test.repository";

describe("Delete Model", async () => {
    let userRepository: UserRepository;
    before(async () => {
        const dataSource = new juggler.DataSource({
            name: "db",
            connector: "memory",
        });

        userRepository = new UserRepository(User, dataSource);
    });

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
