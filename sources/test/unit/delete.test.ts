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
        await userRepository.deleteAll();
        await userRepository.createAll([
            {
                username: "user1",
                password: "123",
            },
            {
                username: "user2",
                password: "123",
                children: [
                    {
                        username: "user2Child",
                        password: "111",
                    },
                ],
            },
            {
                username: "user3",
                password: "123",
                children: [
                    {
                        username: "user3Child",
                        password: "111",
                    },
                ],
            },
        ]);

        /**
         * Test delete multiple users by where with relations
         */
        expect(
            await userRepository.deleteAll(
                {
                    username: { inq: ["user1", "user2", "user3"] },
                },
                {
                    filter: {
                        include: [
                            {
                                relation: "children",
                                scope: {
                                    where: {
                                        username: "user2Child",
                                    },
                                },
                            },
                        ],
                    },
                }
            )
        ).containDeep({ count: 4 });
    });

    it("delete() Test", async () => {
        await userRepository.deleteAll();
        await userRepository.createAll([
            {
                id: "1",
                username: "user1",
                password: "123",
            },
            {
                id: "2",
                username: "user2",
                password: "123",
                children: [
                    {
                        username: "user2Child",
                        password: "111",
                    },
                ],
            },
            {
                id: "3",
                username: "user3",
                password: "123",
                children: [
                    {
                        id: "5",
                        username: "user3Child",
                        password: "111",
                    },
                ],
            },
        ]);
        await userRepository.delete(new User({ id: "2" }), {
            filter: {
                include: [
                    {
                        relation: "children",
                        scope: {
                            where: {
                                username: "user2Child",
                            },
                        },
                    },
                ],
            },
        });

        /**
         * Test delete one user by entity with relations
         */
        expect(await userRepository.count()).containDeep({ count: 3 });
    });

    it("deleteById() Test", async () => {
        await userRepository.deleteAll();
        await userRepository.createAll([
            {
                id: "1",
                username: "user1",
                password: "123",
            },
            {
                id: "2",
                username: "user2",
                password: "123",
                children: [
                    {
                        username: "user2Child",
                        password: "111",
                    },
                ],
            },
            {
                id: "3",
                username: "user3",
                password: "123",
                children: [
                    {
                        id: "5",
                        username: "user3Child",
                        password: "111",
                    },
                ],
            },
        ]);
        await userRepository.deleteById("2", {
            filter: {
                include: [
                    {
                        relation: "children",
                        scope: {
                            where: {
                                username: "user2Child",
                            },
                        },
                    },
                ],
            },
        });

        /**
         * Test delete one user by id with relations
         */
        expect(await userRepository.count()).containDeep({ count: 3 });
    });
});
