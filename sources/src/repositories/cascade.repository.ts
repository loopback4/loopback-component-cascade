import { MixinTarget } from "@loopback/core";
import { InvocationContext } from "@loopback/context";
import {
    DefaultCrudRepository,
    DataObject,
    Options,
    Entity,
    Where,
    Filter,
} from "@loopback/repository";

export interface CascadeOptions extends Options {
    filter?: Filter<any>;
}

/**
 * This interface contains additional types added to CascadeRepositoryMixin type
 */
export interface CascadeRepository<
    T extends Entity,
    ID,
    Relations extends object = {}
> {}

/**
 *  +----------+    +--------+
 *  | findById |    | exists |
 *  +----+-----+    +---+----+
 *       |              |
 *       |              |
 *  +----v----+     +---v---+
 *  | findOne |     | count |
 *  +---------+     +-------+
 *
 *
 *  +--------+    +------------+   +-------------+
 *  | update |    | updateById |   | replaceById |
 *  +----+---+    +-----+------+   +-------+-----+
 *       |              |                  |
 *       |              |                  |
 *       |        +-----v-----+            |
 *       +--------> updateAll <------------+
 *                +-----------+
 *
 *
 *  +--------+    +------------+
 *  | delete |    | deleteById |
 *  +--+-----+    +------+-----+
 *     |                 |
 *     |                 |
 *     |  +-----------+  |
 *     +--> deleteAll <--+
 *        +-----------+
 */
/**
 * Cascade repository mixin, add Create, Update, Delete operations supporting Cascade
 */
export function CascadeRepositoryMixin<
    T extends Entity,
    ID,
    Relations extends object = {}
>() {
    return function <
        R extends MixinTarget<DefaultCrudRepository<T, ID, Relations>>
    >(superClass: R) {
        class MixedRepository extends superClass
            implements CascadeRepository<T, ID, Relations> {
            /**
             * Check entity unique fields
             * and set `uid`, `beginDate`, `endDate`, `id` to undefined
             * then create entity
             */
            create = async (
                entity: DataObject<T>,
                options?: CascadeOptions
            ) => {
                if (options && options.all) {
                    return super.create(entity, options);
                }

                return await super.create(
                    {
                        ...entity,
                        uid: undefined,
                        beginDate: undefined,
                        endDate: undefined,
                        id: undefined,
                    },
                    options
                );
            };

            /**
             * Check entities unique fields
             * and set `uid`, `beginDate`, `endDate`, `id` to undefined
             * then create entities
             */
            createAll = async (
                entities: DataObject<T>[],
                options?: CascadeOptions
            ) => {
                if (options && options.all) {
                    return super.createAll(entities, options);
                }

                return await super.createAll(
                    entities.map((entity) => ({
                        ...entity,
                        uid: undefined,
                        beginDate: undefined,
                        endDate: undefined,
                        id: undefined,
                    })),
                    options
                );
            };

            /**
             * Cascade where and update all entities
             */
            updateAll = async (
                data: DataObject<T>,
                where?: Where<T>,
                options?: CascadeOptions
            ) => {
                const CascadeContext = new InvocationContext(
                    undefined as any,
                    this,
                    "update",
                    Array.from(arguments)
                );

                return await super.updateAll(
                    data,
                    await config.where(CascadeContext, where || {}),
                    options
                );
            };

            /**
             * Cascade id and update one entity
             */
            updateById = async (
                id: ID,
                data: DataObject<T>,
                options?: CascadeOptions
            ) => {
                await this.updateAll(
                    data,
                    this.entityClass.buildWhereForId(id),
                    options
                );
            };

            /**
             * Cascade id and update one entity
             */
            update = async (entity: T, options?: CascadeOptions) => {
                await this.updateAll(
                    entity,
                    this.entityClass.buildWhereForId(
                        this.entityClass.getIdOf(entity)
                    ),
                    options
                );
            };

            /**
             * Cascade id and replace one entity
             */
            replaceById = async (
                id: ID,
                data: DataObject<T>,
                options?: CascadeOptions
            ) => {
                await this.updateAll(
                    {
                        ...Object.fromEntries(
                            Object.entries(
                                this.entityClass.definition.properties
                            ).map(([key, _]) => [key, undefined])
                        ),
                        ...data,
                    },
                    this.entityClass.buildWhereForId(id),
                    options
                );
            };

            /**
             * Delete cascade by where and options.filter
             */
            deleteAll = async (where?: Where<T>, options?: CascadeOptions) => {
                const CascadeContext = new InvocationContext(
                    undefined as any,
                    this,
                    "delete",
                    Array.from(arguments)
                );

                return await super.deleteAll(
                    await config.where(CascadeContext, where || {}),
                    options
                );
            };

            /**
             * Delete cascade by entity and options.filter
             */
            delete = async (entity: T, options?: CascadeOptions) => {
                await this.deleteAll(
                    this.entityClass.buildWhereForId(
                        this.entityClass.getIdOf(entity)
                    ),
                    options
                );
            };

            /**
             * Delete cascade by id and options.filter
             */
            deleteById = async (id: ID, options?: CascadeOptions) => {
                await this.deleteAll(
                    this.entityClass.buildWhereForId(id),
                    options
                );
            };
        }

        return MixedRepository;
    };
}
