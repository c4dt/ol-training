import Long from "long";

import { Argument, ByzCoinRPC, ClientTransaction, InstanceID, Instruction } from "@c4dt/cothority/byzcoin";
import {
    Coin,
    CoinInstance,
    CredentialsInstance,
    CredentialStruct,
    DarcInstance,
    SPAWNER_COIN,
    SpawnerInstance,
} from "@c4dt/cothority/byzcoin/contracts";
import { AddTxResponse } from "@c4dt/cothority/byzcoin/proto/requests";
import { Darc, IIdentity, Rule } from "@c4dt/cothority/darc";
import { Log } from "@c4dt/cothority/index";

import { CalypsoReadInstance, CalypsoWriteInstance, Read, Write } from "@c4dt/cothority/calypso";
import { Point } from "@dedis/kyber/index";
import { randomBytes } from "crypto";
import { TransactionBuilder } from "./byzcoin";
import { EAttributesPublic, ECredentials } from "./credentialStructBS";
import { ICoin } from "./genesis";
import { UserSkeleton } from "./userSkeleton";

/**
 * SpawnerTransactionBuilder offers an easy interface to create new instances
 * using the SpawnerInstance.
 * Contrary to 'pure' spawns, when using the SpawnerInstance, the caller must
 * pay coins for the creation of a new instance.
 * The SpawnerTransactionBuilder signs and sends all instructions when `sendCoins`
 * is called.
 * After a call to `sendCoins`, the builder can be used again for new instructions.
 */
export class SpawnerTransactionBuilder extends TransactionBuilder {
    static readonly longWait = 10;

    private cost = Long.fromNumber(0);

    constructor(public bc: ByzCoinRPC, private spawner: SpawnerInstance, private coin: ICoin) {
        super(bc);
    }

    clone(): SpawnerTransactionBuilder {
        return new SpawnerTransactionBuilder(this.bc, this.spawner, this.coin);
    }

    async sendCoins(wait = 0): Promise<[ClientTransaction, AddTxResponse]> {
        if (this.cost.greaterThan(0)) {
            this.prepend(Instruction.createInvoke(this.coin.instance.id,
                CoinInstance.contractID, CoinInstance.commandFetch,
                [new Argument({
                    name: CoinInstance.argumentCoins,
                    value: Buffer.from(this.cost.toBytesLE()),
                })]));
        }
        return this.send([this.coin.signers], wait);
    }

    spawnDarc(d: Darc): Darc {
        this.spawn(this.spawner.id, DarcInstance.contractID,
            [new Argument({ name: SpawnerInstance.argumentDarc, value: d.toBytes() })]);
        this.cost = this.cost.add(this.spawner.costs.costDarc.value);
        return d;
    }

    spawnDarcBasic(desc: string, signers: IIdentity[]): Darc {
        return this.spawnDarc(Darc.createBasic(signers, signers, Buffer.from(desc)));
    }

    spawnCoin(type: InstanceID, darcID: InstanceID, coinID: InstanceID = darcID,
              initial = Long.fromNumber(0)): CoinInstance {
        if (initial.greaterThan(0) && !type.equals(SPAWNER_COIN)) {
            throw new Error("can only transfer initial coins using SPAWNER_COIN");
        }

        this.spawn(this.spawner.id, CoinInstance.contractID,
            [new Argument({ name: SpawnerInstance.argumentCoinName, value: type }),
                new Argument({ name: SpawnerInstance.argumentDarcID, value: darcID }),
                new Argument({ name: SpawnerInstance.argumentCoinID, value: coinID }),
                new Argument({ name: SpawnerInstance.argumentCoinValue, value: Buffer.from(initial.toBytesLE()) }),
            ]);
        this.cost = this.cost.add(this.spawner.costs.costCoin.value.add(initial));
        return CoinInstance.create(this.bc, CoinInstance.coinIID(coinID),
            darcID, new Coin({ name: type, value: initial }));
    }

    spawnCredential(cred: CredentialStruct, darcID: InstanceID, credID?: InstanceID) {
        if (!credID) {
            credID = cred.getAttribute(ECredentials.pub, EAttributesPublic.seedPub);
        }
        this.spawn(this.spawner.id, CredentialsInstance.contractID,
            [new Argument({ name: SpawnerInstance.argumentCredID, value: credID }),
                new Argument({ name: SpawnerInstance.argumentDarcID, value: darcID }),
                new Argument({ name: SpawnerInstance.argumentCredential, value: cred.toBytes() })]);
        this.cost = this.cost.add(this.spawner.costs.costCredential.value);
    }

    spawnCalypsoWrite(darcID: InstanceID, wr: Write, preID = randomBytes(32)): InstanceID {
        const args = [
            new Argument({ name: CalypsoWriteInstance.argumentWrite, value: Buffer.from(Write.encode(wr).finish()) }),
            new Argument({ name: CalypsoWriteInstance.argumentDarcID, value: darcID }),
            new Argument({ name: CalypsoWriteInstance.argumentPreID, value: preID })];
        this.spawn(this.spawner.id, CalypsoWriteInstance.contractID, args);
        this.cost = this.cost.add(this.spawner.costs.costCWrite.value);
        return CalypsoWriteInstance.preToInstID(preID);
    }

    spawnCalypsoRead(wrID: InstanceID, pub: Point, preID = randomBytes(32)): InstanceID {
        const read = new Read({ write: wrID, xc: pub.marshalBinary() });
        const args = [
            new Argument({ name: CalypsoReadInstance.argumentRead, value: Buffer.from(Read.encode(read).finish()) }),
            new Argument({ name: CalypsoReadInstance.argumentPreID, value: preID }),
        ];
        this.spawn(wrID, CalypsoReadInstance.contractID, args);
        this.cost = this.cost.add(this.spawner.costs.costCRead.value);
        return CalypsoReadInstance.preToInstID(preID);
    }

    evolveDarcAddRules(d: Darc, rules: Rule[]): Darc {
        const newD = d.evolve();
        rules.forEach((rule) => newD.rules.setRuleExp(rule.action, rule.getExpr()));
        this.invoke(d.getBaseID(), DarcInstance.contractID, DarcInstance.commandEvolve,
            [new Argument({ name: DarcInstance.argumentDarc, value: newD.toBytes() })]);
        return newD;
    }

    createUser(user: UserSkeleton, initial = Long.fromNumber(0)) {
        Log.lvl3("Spawning darcs");
        [user.darcSign, user.darcDevice, user.darcCred, user.darcCoin].forEach((d) => this.spawnDarc(d));

        Log.lvl3("Spawning coin");
        this.spawnCoin(SPAWNER_COIN, user.darcCoin.getBaseID(), user.keyPair.pub.marshalBinary(), initial);

        Log.lvl3("Spawning credential with darcID", user.darcCred.getBaseID());
        this.spawnCredential(user.cred, user.darcCred.getBaseID());
    }
}