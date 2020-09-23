import { MixinTarget } from "@loopback/core";
import {
    DefaultCrudRepository,
    RelationType,
    DataObject,
    Options,
    Entity,
    Where,
} from "@loopback/repository";

/**
 * This interface contains additional types added to CascadeRepositoryMixin type
 */
export interface CascadeRepository<
    T extends Entity,
    ID,
    Relations extends object = {}
> {
    cascadeClear(entity: DataObject<T>): DataObject<T>;
    cascadeFind(createdEntity: T, entities: DataObject<T>[]): T;
}

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
 * Cascade repository mixin, add Create, Delete operations supporting Cascade
 */
export function CascadeRepositoryMixin<
    T extends Entity,
    ID,
    Relations extends object = {}
>() {
    return function <
        R extends MixinTarget<DefaultCrudRepository<T, ID, Relations>>
    >(superClass: R) {
        class MixedRepository
            extends superClass
            implements CascadeRepository<T, ID, Relations> {
            /**
             * remove navigational properties from entity
             */
            cascadeClear = (entity: DataObject<T>) => {
                return Object.fromEntries(
                    Object.entries(entity).filter(
                        ([_, value]) => typeof value !== "object"
                    )
                ) as DataObject<T>;
            };

            /**
             * find matched entity for createdEntity by properties equality
             * add matched entity relations to createdEntity
             */
            cascadeFind = (createdEntity: T, entities: DataObject<T>[]) => {
                // Check two models have same properties
                const equalProperty = (
                    property: string,
                    metadata: any,
                    entity: DataObject<T>
                ) => {
                    // Check entity before save has property, then return equality
                    if (property in entity) {
                        return (
                            (createdEntity as any)[property] ===
                            (entity as any)[property]
                        );
                    }

                    // Check entity before save hasn't property and has default value
                    // So it were filled automatically, properties are equal
                    if ("default" in metadata || "defaultFn" in metadata) {
                        return true;
                    }

                    // Entity before save hasn't property and has not default value
                    // But saved model has value
                    return false;
                };

                // Find one matched entity for createdEntity
                const entity = entities
                    .filter((entity) =>
                        // Check createdEntity and entity have equal by properties
                        Object.entries(
                            this.entityClass.definition.properties
                        ).reduce<boolean>(
                            (accumulate, [property, metadata]) =>
                                accumulate &&
                                equalProperty(property, metadata, entity),
                            true
                        )
                    )
                    .pop();

                // Get entity relations
                const entityRelations = Object.fromEntries(
                    Object.entries(entity || {}).filter(
                        ([_, value]) => typeof value === "object"
                    )
                );

                // Add entity relations to raw model
                return {
                    ...createdEntity,
                    ...entityRelations,
                } as T;
            };

            /**
             * result = Create parents
             * result = map(find related entity)
             * for each entity relations
             *      children = map(result[relation])
             *      children = flat(1)
             *      children = map({...entity, [keyFrom]: keyTo})
             *      result = target.createAll(children, options)
             *      result = result.add(children)
             * return result
             */
            createAll = async (
                entities: DataObject<T>[],
                options?: Options
            ) => {
                // Create belongsTo relations

                // Create entities without navigational properties
                let result = await super.createAll(
                    entities.map((entity) => this.cascadeClear(entity)),
                    options
                );

                // Find and add navigational properties for each created entity
                result = result.map((createdEntity) =>
                    this.cascadeFind(createdEntity, entities)
                );

                const cascadeCreateRelations = Object.entries(
                    this.entityClass.definition.relations
                ).filter(([_, metadata]) =>
                    ((metadata as any).cascade || []).includes("create")
                );

                for (let [relation, metadata] of cascadeCreateRelations) {
                    const keyFrom = (metadata as any).keyFrom;
                    const keyTo = (metadata as any).keyTo;

                    const target = (await (this as any)
                        [relation]()
                        .getTargetRepository()) as DefaultCrudRepository<
                        any,
                        any,
                        any
                    >;
                    if (!target) {
                        continue;
                    }

                    let children = result
                        .map((entity: any) =>
                            [entity[relation]].flat(1).map((child) => ({
                                ...child,
                                [keyTo]: entity[keyFrom],
                            }))
                        )
                        .flat(1)
                        .filter((entity) => entity);
                    if (!("cascadeClear" in target)) {
                        // If target repository doesn't support cascade, remove navigational properties
                        children = children.map((child) =>
                            this.cascadeClear(child)
                        );
                    }
                    if (children.length <= 0) {
                        continue;
                    }

                    // Create children models
                    const childrenResult = await target.createAll(
                        children,
                        options
                    );

                    // Add created children to parents in result
                    result = result.map((entity: any) => {
                        if (metadata.targetsMany) {
                            entity[relation] = childrenResult.filter(
                                (child: any) => child[keyTo] === entity[keyFrom]
                            );
                        } else {
                            entity[relation] = childrenResult.filter(
                                (child: any) => child[keyTo] === entity[keyFrom]
                            )[0];
                        }

                        return entity;
                    });
                }

                return result;
            };

            /**
             * Cascade create() using createAll()
             */
            create = async (entity: DataObject<T>, options?: Options) => {
                const result = await this.createAll([entity], options);

                return result[0];
            };

            /**
             * Select parents by where
             * result = delete parents by where
             * for each entity, delete cascade relations
             *      childrenWhere = {[keyFrom]: {inq: parents[keyTo]}}
             *      result += target.deleteAll(childrenWhere, options)
             * return result
             */
            deleteAll = async (where?: Where<T>, options?: Options) => {
                const parents = await super.find({ where: where }, options);

                let result = await super.deleteAll(where, options);

                const cascadeDeleteRelations = Object.entries(
                    this.entityClass.definition.relations
                ).filter(([_, metadata]) =>
                    ((metadata as any).cascade || []).includes("delete")
                );

                for (const [relation, metadata] of cascadeDeleteRelations) {
                    const keyFrom = (metadata as any).keyFrom;
                    const keyTo = (metadata as any).keyTo;

                    const parentsIds = parents
                        .map((item: any) => item[keyFrom])
                        .filter((item) => item);
                    if (parentsIds.length <= 0) {
                        continue;
                    }

                    const target = (await (this as any)
                        [relation]()
                        .getTargetRepository()) as DefaultCrudRepository<
                        any,
                        any,
                        any
                    >;
                    if (!target) {
                        continue;
                    }

                    const childrenWhere = {
                        [keyTo]: {
                            inq: parentsIds,
                        },
                    };

                    result.count += (
                        await target.deleteAll(childrenWhere, options)
                    ).count;
                }

                return result;
            };

            /**
             * Cascade delete() using deleteAll()
             */
            delete = async (entity: T, options?: Options) => {
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
            deleteById = async (id: ID, options?: Options) => {
                await this.deleteAll(
                    this.entityClass.buildWhereForId(id),
                    options
                );
            };
        }

        return MixedRepository;
    };
}
