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
 *  +--------+
 *  | create |
 *  +----+---+
 *       |
 *       |
 *  +----v------+
 *  | createAll |
 *  +-----------+
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
             * result = Create parents
             * result = map to entity
             * for each entity relations
             *      children = map(result[relation])
             *      children = flat(1)
             *      children = map({...entity, [keyFrom]: keyTo})
             *      result = target.createAll(children, options)
             * return result
             */
            createAll = async (
                entities: DataObject<T>[],
                options?: CascadeOptions
            ) => {
                // TODO: remote navigational properties
                let result = await super.createAll(entities, options);

                for (let [relation, metadata] of Object.entries(
                    this.entityClass.definition.relations
                )) {
                    // TODO: find parent model in result
                    const itemsEntities = entities
                        .map((entity: any) => entity[relation])
                        .flat(1)
                        .map((entity) => ({
                            ...entity,
                            [(metadata as any).keyFrom]: (result[-100] as any)[
                                (metadata as any).keyTo
                            ],
                        }));

                    // TODO: if target not supports cascade, remove navigational properties
                    (result[-100] as any)[relation] = await super.createAll(
                        itemsEntities,
                        options
                    );
                }

                return result;
            };

            /**
             * Cascade create() using createAll()
             */
            create = async (
                entity: DataObject<T>,
                options?: CascadeOptions
            ) => {
                const result = await this.createAll([entity], options);

                return result[0];
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

                return await super.updateAll(data, where, options);
            };

            /**
             * Cascade updateById() using updateAll()
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
             * Cascade update() using updateAll()
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
             * Cascade replaceById() using updateAll()
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
             * Select parents by where and filter.where
             * result = delete parents by where and filter.where
             * for each entity relations
             *      where = {[keyFrom]: {inq: parents[keyTo]}}
             *      filter = filter.include[relation].scope
             *      result += target.deleteAll(where, {...options, filter})
             * return result
             */
            deleteAll = async (where?: Where<T>, options?: CascadeOptions) => {
                where = {
                    and: [where, options?.filter?.where].filter(
                        (condition) => condition
                    ),
                } as any;

                const items = await super.find({ where: where }, options);

                let result = await super.deleteAll(where, options);

                for (const [relation, metadata] of Object.entries(
                    this.entityClass.definition.relations
                )) {
                    const itemsWhere = {
                        [(metadata as any).keyTo]: {
                            inq: items.map(
                                (item: any) => item[(metadata as any).keyFrom]
                            ),
                        },
                    };
                    const itemsFilter = (options?.filter?.include || []).reduce(
                        (accumulate: any, item) =>
                            item.relation === relation
                                ? item.scope
                                : accumulate,
                        undefined
                    );

                    if (itemsWhere && itemsFilter) {
                        result.count += (
                            await super.deleteAll(itemsWhere, {
                                ...options,
                                filter: itemsFilter,
                            })
                        ).count;
                    }
                }

                return result;
            };

            /**
             * Cascade delete() using deleteAll()
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
             * Cascade deleteById() using deleteAll()
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
