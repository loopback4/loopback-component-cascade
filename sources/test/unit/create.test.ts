import { expect } from "@loopback/testlab";
import { juggler } from "@loopback/repository";

import { User } from "./test.model";
import { UserRepository } from "./test.repository";

describe("Create Model", async () => {
    const datasource: juggler.DataSource = new juggler.DataSource({
        name: "db",
        connector: "memory",
    });
    const userRepository = new UserRepository(User, datasource);

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
