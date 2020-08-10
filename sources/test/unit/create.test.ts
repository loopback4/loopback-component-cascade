import { expect } from "@loopback/testlab";
import { juggler } from "@loopback/repository";

import { User } from "./test.model";
import { UserRepository } from "./test.repository";

describe("Create Model", async () => {
    let userRepository: UserRepository;
    before(async () => {
        const dataSource = new juggler.DataSource({
            name: "db",
            connector: "memory",
        });

        userRepository = new UserRepository(User, dataSource);
    });

    it("create() Test", async () => {
        /**
         * Test create one user without relation
         */
    });

    it("createAll() Test", async () => {
        /**
         * Test create multiple users with different usernames(unique)
         */
    });
});
