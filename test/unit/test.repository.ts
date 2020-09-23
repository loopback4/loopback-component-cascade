import { Constructor } from "@loopback/core";
import {
    juggler,
    Getter,
    Entity,
    BelongsToAccessor,
    HasManyRepositoryFactory,
    DefaultCrudRepository,
} from "@loopback/repository";

import { CascadeRepositoryMixin } from "../../src";

import { User, UserRelations } from "./test.model";

export class UserRepository extends CascadeRepositoryMixin<
    User,
    string,
    UserRelations
>()<Constructor<DefaultCrudRepository<User, string, UserRelations>>>(
    DefaultCrudRepository
) {
    public readonly parent: BelongsToAccessor<User, typeof User.prototype.id>;
    public readonly children: HasManyRepositoryFactory<
        User,
        typeof User.prototype.id
    >;

    constructor(
        ctor: typeof Entity & {
            prototype: User;
        },
        dataSource: juggler.DataSource
    ) {
        super(ctor, dataSource);

        this.parent = this.createBelongsToAccessorFor(
            "parent",
            Getter.fromValue(this)
        );
        this.registerInclusionResolver("parent", this.parent.inclusionResolver);

        this.children = this.createHasManyRepositoryFactoryFor(
            "children",
            Getter.fromValue(this)
        );
        this.registerInclusionResolver(
            "children",
            this.children.inclusionResolver
        );
    }
}
