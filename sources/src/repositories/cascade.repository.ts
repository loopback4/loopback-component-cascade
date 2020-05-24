import { InvocationContext } from "@loopback/context";
import {
    juggler,
    Class,
    DefaultCrudRepository,
    Entity,
    Where,
    Fields,
} from "@loopback/repository";

import { Ctor } from "../types";

export interface RepositoryConfig<Model extends Entity> {
    id: keyof Model;
    where: (
        context: InvocationContext,
        where: Where<Model>
    ) => Promise<Where<Model>>;
    fields: (
        context: InvocationContext,
        fields: Fields<Model>
    ) => Promise<Fields<Model>>;
}

/**
 * Repository Type
 */
export interface CascadeRepository<
    Model extends Entity,
    ModelID,
    ModelRelations extends object = {}
> extends DefaultCrudRepository<Model, ModelID, ModelRelations> {}

/**
 * Repository Mixin
 */
export function CascadeRepositoryMixin<
    Model extends Entity,
    ModelID,
    ModelRelations extends object = {}
>(config: RepositoryConfig<Model>) {
    /**
     * Return function with generic type of repository class, returns mixed in class
     *
     * bugfix: optional type, load type from value
     */
    return function <
        RepositoryClass extends Class<
            DefaultCrudRepository<Model, ModelID, ModelRelations>
        >
    >(
        superClass?: RepositoryClass
    ): RepositoryClass &
        Class<CascadeRepository<Model, ModelID, ModelRelations>> {
        const parentClass: Class<DefaultCrudRepository<
            Model,
            ModelID,
            ModelRelations
        >> = superClass || DefaultCrudRepository;

        class Repository extends parentClass
            implements CascadeRepository<Model, ModelID, ModelRelations> {
            constructor(ctor: Ctor<Model>, dataSource: juggler.DataSource) {
                super(ctor, dataSource);
            }
        }

        return Repository as any;
    };
}
