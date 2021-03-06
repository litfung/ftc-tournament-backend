import * as mongoose from 'mongoose';
import * as shortid from 'shortid';
import { prop, arrayProp, pre, staticMethod, instanceMethod, Typegoose, ModelType, InstanceType, Ref } from 'typegoose';
import * as bcrypt from 'bcrypt';


export function cleanUserRef(ref: Ref<User>): InstanceType<User> {
  let doc: InstanceType<any> = new UserModel(ref.valueOf());
  doc.isNew = false;
  doc.clean();
  return doc;
}

export class Email extends Typegoose {
  @prop()
  value: string;
  @prop()
  type?: string;
}

export class Photo extends Typegoose {
  @prop()
  value: string;
}

export class Name extends Typegoose {
  @prop()
  givenName?: string;
  @prop()
  familyName?: string;
  @prop()
  middleName?: string;
}
 
export class Profile extends Typegoose {
  @prop()
  provider?: string;
  @prop()
  id?: string;
  @prop()
  displayName?: string;
  @prop()
  name?: Name;
  @arrayProp({ items: Email })
  emails?: Email[];
  @arrayProp({ items: Photo })
  photos?: Photo[];
}

@pre<User>('save', function(next) {
  const user = this;
  if (this.cleaned) {
    UserModel.findById(this._id).then((full: InstanceType<User>) => {
      user.password = full.password;
      user.refreshToken = full.refreshToken;
      user.cleaned = false;
      next();
    }).catch(err => {
      next(err);
    });
  } else if (this.isModified('password')) {
    bcrypt.genSalt(10).then(salt => {
      bcrypt.hash(user.password, salt).then(hash => {
        user.password = hash;
        next();
      });
    }).catch(err => {
      next(err);
    });
  } else {
    next();
  }
})
export class User extends Typegoose {
  id: string;
  @prop({ required: true, unique: true, default: shortid.generate })
  shortid: string;
  @prop({ unique: true })
  username?: string;
  @prop()
  password?: string;
  @prop()
  passwordResetToken?: string;
  @prop()
  passwordResetExpires?: Date;
  @prop()
  refreshToken?: string;
  @prop()
  profile: Profile;
  @prop()
  scopes: string;
  cleaned: boolean;
  @instanceMethod
  validPassword(this: InstanceType<User>, candidatePassword: string): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.password);
  };
  @instanceMethod
  clean(this: InstanceType<User>): InstanceType<User> {
    let cleaned = this;
    cleaned.password = undefined;
    cleaned.refreshToken = undefined;
    cleaned.__v = undefined;
    cleaned.cleaned = true;
    return cleaned;
  }
  @staticMethod
  static findFor(this: ModelType<User> & typeof User, id: string): mongoose.DocumentQuery<InstanceType<User>, InstanceType<User>> {
    if (mongoose.Types.ObjectId.isValid(id)) {
      return this.findById(id);
    } else {
      return this.findOne({ shortid: id });
    }
  }
}

export const UserModel = new User().getModelForClass(User);
export default UserModel;